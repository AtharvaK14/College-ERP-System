"""
Teacher router - attendance entry, marks entry, leave applications,
complaint responses, timetable, and student roster access.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_teacher, get_current_user
from app.database import get_db
from app.models import (
    Attendance, Class, Complaint, ComplaintStatus, Course, Leave,
    Marks, Student, Teacher, TeacherCourse, User,
)
from app.schemas import (
    AttendanceBulkCreate, AttendanceOut,
    ComplaintOut, ComplaintResponse,
    LeaveCreate, LeaveOut,
    MarksBulkCreate, MarksCreate, MarksOut,
    TeacherCourseOut, TeacherDashboard, TeacherOut, StudentOut,
)

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


async def _get_teacher(user: User, db: AsyncSession) -> Teacher:
    result = await db.execute(
        select(Teacher)
        .options(selectinload(Teacher.department))
        .where(Teacher.user_id == user.id)
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(404, "Teacher profile not found")
    return teacher


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=TeacherDashboard)
async def teacher_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    teacher = await _get_teacher(user, db)

    # Assigned courses
    tc_result = await db.execute(
        select(TeacherCourse)
        .options(
            selectinload(TeacherCourse.course),
            selectinload(TeacherCourse.class_).selectinload(Class.department),
        )
        .where(TeacherCourse.teacher_id == teacher.id)
    )
    assigned = tc_result.scalars().all()

    # Pending leaves count
    from sqlalchemy import func
    pending = (await db.execute(
        select(func.count(Leave.id))
        .where(
            and_(Leave.teacher_id == teacher.id, Leave.status == "pending")
        )
    )).scalar()

    # Unresolved complaints count
    unresolved = (await db.execute(
        select(func.count(Complaint.id))
        .where(
            and_(Complaint.teacher_id == teacher.id, Complaint.status == ComplaintStatus.open)
        )
    )).scalar()

    return TeacherDashboard(
        teacher=teacher,
        assigned_courses=assigned,
        pending_leaves=pending,
        unresolved_complaints=unresolved,
    )


# ---------------------------------------------------------------------------
# My courses and students
# ---------------------------------------------------------------------------

@router.get("/my-courses", response_model=list[TeacherCourseOut])
async def my_courses(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    teacher = await _get_teacher(user, db)
    result = await db.execute(
        select(TeacherCourse)
        .options(
            selectinload(TeacherCourse.course),
            selectinload(TeacherCourse.class_).selectinload(Class.department),
            selectinload(TeacherCourse.teacher),
        )
        .where(TeacherCourse.teacher_id == teacher.id)
    )
    return result.scalars().all()


@router.get("/courses/{course_id}/classes/{class_id}/students", response_model=list[StudentOut])
async def students_in_class(
    course_id: int,
    class_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    """Return all students in a class for a given course (teacher must own the assignment)."""
    teacher = await _get_teacher(user, db)

    # Verify this teacher owns this course+class assignment (admins bypass)
    if user.role.value != "admin":
        tc = await db.execute(
            select(TeacherCourse).where(
                and_(
                    TeacherCourse.teacher_id == teacher.id,
                    TeacherCourse.course_id == course_id,
                    TeacherCourse.class_id == class_id,
                )
            )
        )
        if not tc.scalar_one_or_none():
            raise HTTPException(403, "You are not assigned to this course/class")

    result = await db.execute(
        select(Student)
        .options(selectinload(Student.class_).selectinload(Class.department))
        .where(Student.class_id == class_id)
        .order_by(Student.usn)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

@router.post("/attendance", response_model=list[AttendanceOut])
async def bulk_mark_attendance(
    body: AttendanceBulkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    """Upsert attendance for an entire class on a date."""
    records = []
    for rec in body.records:
        # Check for existing record
        existing = await db.execute(
            select(Attendance).where(
                and_(
                    Attendance.student_id == rec.student_id,
                    Attendance.course_id == body.course_id,
                    Attendance.date == body.date,
                )
            )
        )
        att = existing.scalar_one_or_none()
        if att:
            att.status = rec.status
        else:
            att = Attendance(
                student_id=rec.student_id,
                course_id=body.course_id,
                date=body.date,
                status=rec.status,
            )
            db.add(att)
        await db.flush()
        records.append(att)
    return records


@router.get("/attendance", response_model=list[AttendanceOut])
async def get_attendance(
    course_id: int = Query(...),
    class_id: int = Query(...),
    date_filter: Optional[date] = Query(None, alias="date"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    query = (
        select(Attendance)
        .join(Student, Attendance.student_id == Student.id)
        .where(
            and_(
                Attendance.course_id == course_id,
                Student.class_id == class_id,
            )
        )
    )
    if date_filter:
        query = query.where(Attendance.date == date_filter)
    result = await db.execute(query.order_by(Attendance.date, Attendance.student_id))
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Marks
# ---------------------------------------------------------------------------

@router.post("/marks", response_model=list[MarksOut])
async def bulk_enter_marks(
    body: MarksBulkCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    """Upsert marks for multiple students for one exam event."""
    records = []
    for rec in body.records:
        student_id = rec["student_id"]
        marks_scored = rec["marks_scored"]

        existing = await db.execute(
            select(Marks).where(
                and_(
                    Marks.student_id == student_id,
                    Marks.course_id == body.course_id,
                    Marks.mark_type == body.mark_type,
                )
            )
        )
        mark = existing.scalar_one_or_none()
        if mark:
            mark.marks_scored = marks_scored
            mark.total_marks = body.total_marks
        else:
            mark = Marks(
                student_id=student_id,
                course_id=body.course_id,
                mark_type=body.mark_type,
                marks_scored=marks_scored,
                total_marks=body.total_marks,
            )
            db.add(mark)
        await db.flush()
        records.append(mark)
    return records


@router.post("/marks/single", response_model=MarksOut)
async def enter_single_mark(
    body: MarksCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    existing = await db.execute(
        select(Marks).where(
            and_(
                Marks.student_id == body.student_id,
                Marks.course_id == body.course_id,
                Marks.mark_type == body.mark_type,
            )
        )
    )
    mark = existing.scalar_one_or_none()
    if mark:
        mark.marks_scored = body.marks_scored
        mark.total_marks = body.total_marks
    else:
        mark = Marks(**body.model_dump())
        db.add(mark)
    await db.flush()
    if mark.id is None:
        await db.flush()
    return mark


@router.get("/marks", response_model=list[MarksOut])
async def get_marks(
    course_id: int = Query(...),
    class_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    result = await db.execute(
        select(Marks)
        .join(Student, Marks.student_id == Student.id)
        .where(
            and_(Marks.course_id == course_id, Student.class_id == class_id)
        )
        .order_by(Marks.mark_type, Student.usn)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Leave
# ---------------------------------------------------------------------------

@router.get("/leaves", response_model=list[LeaveOut])
async def my_leaves(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    teacher = await _get_teacher(user, db)
    result = await db.execute(
        select(Leave)
        .options(selectinload(Leave.teacher))
        .where(Leave.teacher_id == teacher.id)
        .order_by(Leave.applied_at.desc())
    )
    return result.scalars().all()


@router.post("/leaves", response_model=LeaveOut, status_code=201)
async def apply_leave(
    body: LeaveCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    teacher = await _get_teacher(user, db)
    leave = Leave(teacher_id=teacher.id, **body.model_dump())
    db.add(leave)
    await db.flush()
    result = await db.execute(
        select(Leave)
        .options(selectinload(Leave.teacher))
        .where(Leave.id == leave.id)
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Complaints (teacher responds to student complaints)
# ---------------------------------------------------------------------------

@router.get("/complaints", response_model=list[ComplaintOut])
async def my_complaints(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    teacher = await _get_teacher(user, db)
    result = await db.execute(
        select(Complaint)
        .where(Complaint.teacher_id == teacher.id)
        .order_by(Complaint.created_at.desc())
    )
    return result.scalars().all()


@router.put("/complaints/{complaint_id}", response_model=ComplaintOut)
async def respond_complaint(
    complaint_id: int,
    body: ComplaintResponse,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_teacher),
):
    teacher = await _get_teacher(user, db)
    result = await db.execute(
        select(Complaint).where(
            and_(Complaint.id == complaint_id, Complaint.teacher_id == teacher.id)
        )
    )
    complaint = result.scalar_one_or_none()
    if not complaint:
        raise HTTPException(404, "Complaint not found")
    complaint.response = body.response
    complaint.status = body.status
    await db.flush()
    await db.refresh(complaint)
    return complaint
