"""
Student router - view attendance, marks, report card, notices,
submit/view complaints, direct messages, and forum.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_student
from app.database import get_db
from app.models import (
    Attendance, AttendanceStatus, Class, ComplaintStatus, Course,
    Marks, Notice, Student, StudentCourse, Teacher,
    Complaint, Message, User,
)
from app.schemas import (
    AttendanceOut, AttendanceSummary,
    ComplaintCreate, ComplaintOut,
    MarksOut, MessageCreate, MessageOut,
    NoticeOut, ReportCard, StudentDashboard, StudentOut,
)

router = APIRouter(prefix="/api/student", tags=["student"])

ATTENDANCE_THRESHOLD = 75.0


async def _get_student(user: User, db: AsyncSession) -> Student:
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.class_).selectinload(Class.department)
        )
        .where(Student.user_id == user.id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Student profile not found")
    return student


async def _build_attendance_summaries(student_id: int, db: AsyncSession) -> list[AttendanceSummary]:
    # Get all enrolled courses
    sc_result = await db.execute(
        select(StudentCourse)
        .options(selectinload(StudentCourse.course))
        .where(StudentCourse.student_id == student_id)
    )
    enrollments = sc_result.scalars().all()

    summaries = []
    for enrollment in enrollments:
        course = enrollment.course
        total = (await db.execute(
            select(func.count(Attendance.id)).where(
                and_(Attendance.student_id == student_id, Attendance.course_id == course.id)
            )
        )).scalar() or 0

        attended = (await db.execute(
            select(func.count(Attendance.id)).where(
                and_(
                    Attendance.student_id == student_id,
                    Attendance.course_id == course.id,
                    Attendance.status == AttendanceStatus.present,
                )
            )
        )).scalar() or 0

        pct = round((attended / total * 100) if total > 0 else 0.0, 2)
        summaries.append(
            AttendanceSummary(
                course_id=course.id,
                course_name=course.name,
                course_shortname=course.shortname,
                attended=attended,
                total=total,
                percentage=pct,
                below_threshold=pct < ATTENDANCE_THRESHOLD,
            )
        )
    return summaries


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=StudentDashboard)
async def student_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    student = await _get_student(user, db)
    summaries = await _build_attendance_summaries(student.id, db)

    notices_result = await db.execute(
        select(Notice)
        .where(Notice.is_active == True)
        .order_by(Notice.created_at.desc())
        .limit(5)
    )
    recent_notices = notices_result.scalars().all()

    return StudentDashboard(
        student=student,
        attendance_summaries=summaries,
        recent_notices=recent_notices,
    )


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@router.get("/profile", response_model=StudentOut)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    return await _get_student(user, db)


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

@router.get("/attendance", response_model=list[AttendanceSummary])
async def attendance_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    student = await _get_student(user, db)
    return await _build_attendance_summaries(student.id, db)


@router.get("/attendance/{course_id}/detail", response_model=list[AttendanceOut])
async def attendance_detail(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    """Day-by-day attendance for one course (for calendar view)."""
    student = await _get_student(user, db)
    result = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.student_id == student.id,
                Attendance.course_id == course_id,
            )
        ).order_by(Attendance.date)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Marks
# ---------------------------------------------------------------------------

@router.get("/marks", response_model=list[MarksOut])
async def my_marks(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    student = await _get_student(user, db)
    result = await db.execute(
        select(Marks)
        .where(Marks.student_id == student.id)
        .order_by(Marks.course_id, Marks.mark_type)
    )
    return result.scalars().all()


@router.get("/report-card", response_model=ReportCard)
async def report_card(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    """Full report card with marks + attendance per course + CGPA."""
    student = await _get_student(user, db)

    sc_result = await db.execute(
        select(StudentCourse)
        .options(selectinload(StudentCourse.course))
        .where(StudentCourse.student_id == student.id)
    )
    enrollments = sc_result.scalars().all()

    courses_data = []
    total_weighted = 0.0
    total_credits = 0

    for enrollment in enrollments:
        course = enrollment.course

        marks_result = await db.execute(
            select(Marks).where(
                and_(Marks.student_id == student.id, Marks.course_id == course.id)
            )
        )
        all_marks = marks_result.scalars().all()

        # Calculate CIE average (best 3 of 5) + SEE
        cie_marks = [m for m in all_marks if m.mark_type.value.startswith("CIE")]
        see_marks = [m for m in all_marks if m.mark_type.value == "SEE"]

        cie_pcts = sorted(
            [m.marks_scored / m.total_marks * 100 for m in cie_marks], reverse=True
        )
        cie_avg = sum(cie_pcts[:3]) / 3 if cie_pcts else 0
        see_pct = (see_marks[0].marks_scored / see_marks[0].total_marks * 100) if see_marks else 0

        # Weighted: CIE contributes 50%, SEE 50% (scaled to 100)
        final_pct = (cie_avg * 0.5) + (see_pct * 0.5)

        # Grade point on 10-point scale
        gp = _pct_to_grade_point(final_pct)
        total_weighted += gp * course.credits
        total_credits += course.credits

        # Attendance for this course
        att_total = (await db.execute(
            select(func.count(Attendance.id)).where(
                and_(Attendance.student_id == student.id, Attendance.course_id == course.id)
            )
        )).scalar() or 0
        att_present = (await db.execute(
            select(func.count(Attendance.id)).where(
                and_(
                    Attendance.student_id == student.id,
                    Attendance.course_id == course.id,
                    Attendance.status == AttendanceStatus.present,
                )
            )
        )).scalar() or 0

        courses_data.append({
            "course": {"id": course.id, "name": course.name, "shortname": course.shortname, "credits": course.credits},
            "marks": [{"mark_type": m.mark_type.value, "marks_scored": m.marks_scored, "total_marks": m.total_marks} for m in all_marks],
            "cie_avg": round(cie_avg, 2),
            "see_pct": round(see_pct, 2),
            "final_pct": round(final_pct, 2),
            "grade_point": gp,
            "attendance": {"attended": att_present, "total": att_total, "percentage": round(att_present / att_total * 100 if att_total else 0, 2)},
        })

    cgpa = round(total_weighted / total_credits, 2) if total_credits else 0.0
    return ReportCard(student=student, courses=courses_data, cgpa=cgpa)


def _pct_to_grade_point(pct: float) -> float:
    if pct >= 90: return 10.0
    if pct >= 80: return 9.0
    if pct >= 70: return 8.0
    if pct >= 60: return 7.0
    if pct >= 50: return 6.0
    if pct >= 40: return 5.0
    return 0.0


# ---------------------------------------------------------------------------
# Notices
# ---------------------------------------------------------------------------

@router.get("/notices", response_model=list[NoticeOut])
async def get_notices(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    result = await db.execute(
        select(Notice)
        .where(Notice.is_active == True)
        .order_by(Notice.created_at.desc())
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Complaints
# ---------------------------------------------------------------------------

@router.get("/complaints", response_model=list[ComplaintOut])
async def my_complaints(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    student = await _get_student(user, db)
    result = await db.execute(
        select(Complaint)
        .where(Complaint.student_id == student.id)
        .order_by(Complaint.created_at.desc())
    )
    return result.scalars().all()


@router.post("/complaints", response_model=ComplaintOut, status_code=201)
async def file_complaint(
    body: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    student = await _get_student(user, db)
    complaint = Complaint(student_id=student.id, **body.model_dump())
    db.add(complaint)
    await db.flush()
    await db.refresh(complaint)
    return complaint


# ---------------------------------------------------------------------------
# Messages (direct + forum)
# ---------------------------------------------------------------------------

@router.get("/messages", response_model=list[MessageOut])
async def get_messages(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    """Get all direct messages sent to/from this student."""
    result = await db.execute(
        select(Message)
        .options(selectinload(Message.sender))
        .where(
            and_(
                Message.is_forum == False,
                (Message.sender_id == user.id) | (Message.receiver_id == user.id),
            )
        )
        .order_by(Message.sent_at.desc())
    )
    return result.scalars().all()


@router.post("/messages", response_model=MessageOut, status_code=201)
async def send_message(
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    msg = Message(sender_id=user.id, **body.model_dump())
    db.add(msg)
    await db.flush()
    result = await db.execute(
        select(Message).options(selectinload(Message.sender)).where(Message.id == msg.id)
    )
    return result.scalar_one()


@router.get("/forum", response_model=list[MessageOut])
async def get_forum(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    result = await db.execute(
        select(Message)
        .options(selectinload(Message.sender))
        .where(Message.is_forum == True)
        .order_by(Message.sent_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.post("/forum", response_model=MessageOut, status_code=201)
async def post_forum(
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_student),
):
    msg = Message(sender_id=user.id, content=body.content, is_forum=True, receiver_id=None)
    db.add(msg)
    await db.flush()
    result = await db.execute(
        select(Message).options(selectinload(Message.sender)).where(Message.id == msg.id)
    )
    return result.scalar_one()
