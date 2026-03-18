"""
Admin router - manages departments, classes, courses, teachers, students,
leave approvals, notices, and dashboard stats. All endpoints require admin role.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import require_admin
from app.core.security import hash_password
from app.database import get_db
from app.models import (
    Class, Course, Department, Leave, LeaveStatus, Notice,
    Student, Teacher, TeacherCourse, StudentCourse, User, UserRole,
)
from app.schemas import (
    AdminStats, ClassCreate, ClassOut, CourseCreate, CourseOut,
    DepartmentCreate, DepartmentOut, LeaveOut, LeaveStatusUpdate,
    NoticeCreate, NoticeOut, StudentCreate, StudentOut, StudentUpdate,
    TeacherCourseCreate, TeacherCourseOut, TeacherCreate, TeacherOut, TeacherUpdate,
    StudentCourseCreate, StudentCourseOut,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    students = (await db.execute(select(func.count(Student.id)))).scalar()
    teachers = (await db.execute(select(func.count(Teacher.id)))).scalar()
    departments = (await db.execute(select(func.count(Department.id)))).scalar()
    courses = (await db.execute(select(func.count(Course.id)))).scalar()
    pending = (await db.execute(
        select(func.count(Leave.id)).where(Leave.status == LeaveStatus.pending)
    )).scalar()
    return AdminStats(
        total_students=students,
        total_teachers=teachers,
        total_departments=departments,
        total_courses=courses,
        pending_leaves=pending,
    )


# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------

@router.get("/departments", response_model=list[DepartmentOut])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Department))
    return result.scalars().all()


@router.post("/departments", response_model=DepartmentOut, status_code=201)
async def create_department(
    body: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    dept = Department(**body.model_dump())
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentOut)
async def update_department(
    dept_id: int,
    body: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(404, "Department not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(dept, k, v)
    await db.flush()
    await db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}", status_code=204)
async def delete_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(404, "Department not found")
    await db.delete(dept)


# ---------------------------------------------------------------------------
# Classes
# ---------------------------------------------------------------------------

@router.get("/classes", response_model=list[ClassOut])
async def list_classes(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Class).options(selectinload(Class.department))
    )
    return result.scalars().all()


@router.post("/classes", response_model=ClassOut, status_code=201)
async def create_class(
    body: ClassCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    cls = Class(**body.model_dump())
    db.add(cls)
    await db.flush()
    result = await db.execute(
        select(Class).options(selectinload(Class.department)).where(Class.id == cls.id)
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Courses
# ---------------------------------------------------------------------------

@router.get("/courses", response_model=list[CourseOut])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Course))
    return result.scalars().all()


@router.post("/courses", response_model=CourseOut, status_code=201)
async def create_course(
    body: CourseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    course = Course(**body.model_dump())
    db.add(course)
    await db.flush()
    await db.refresh(course)
    return course


@router.put("/courses/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int,
    body: CourseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Course not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(course, k, v)
    await db.flush()
    await db.refresh(course)
    return course


@router.delete("/courses/{course_id}", status_code=204)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Course not found")
    await db.delete(course)


# ---------------------------------------------------------------------------
# Teachers
# ---------------------------------------------------------------------------

@router.get("/teachers", response_model=list[TeacherOut])
async def list_teachers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.department))
    )
    return result.scalars().all()


@router.post("/teachers", response_model=TeacherOut, status_code=201)
async def create_teacher(
    body: TeacherCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    # Check username/email uniqueness
    existing = await db.execute(
        select(User).where(
            (User.username == body.username) | (User.email == body.email)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Username or email already in use")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=UserRole.teacher,
    )
    db.add(user)
    await db.flush()

    teacher = Teacher(
        user_id=user.id,
        department_id=body.department_id,
        name=body.name,
        phone=body.phone,
        address=body.address,
        dob=body.dob,
        sex=body.sex,
    )
    db.add(teacher)
    await db.flush()

    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.department)).where(Teacher.id == teacher.id)
    )
    return result.scalar_one()


@router.put("/teachers/{teacher_id}", response_model=TeacherOut)
async def update_teacher(
    teacher_id: int,
    body: TeacherUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(teacher, k, v)
    await db.flush()
    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.department)).where(Teacher.id == teacher_id)
    )
    return result.scalar_one()


@router.delete("/teachers/{teacher_id}", status_code=204)
async def delete_teacher(
    teacher_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Teacher).where(Teacher.id == teacher_id)
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    # Also delete user account
    user_result = await db.execute(select(User).where(User.id == teacher.user_id))
    user = user_result.scalar_one_or_none()
    await db.delete(teacher)
    if user:
        await db.delete(user)


# ---------------------------------------------------------------------------
# Students
# ---------------------------------------------------------------------------

@router.get("/students", response_model=list[StudentOut])
async def list_students(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Student).options(
            selectinload(Student.class_).selectinload(Class.department)
        )
    )
    return result.scalars().all()


@router.post("/students", response_model=StudentOut, status_code=201)
async def create_student(
    body: StudentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = await db.execute(
        select(User).where(
            (User.username == body.username) | (User.email == body.email)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Username or email already in use")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=UserRole.student,
    )
    db.add(user)
    await db.flush()

    student = Student(
        user_id=user.id,
        class_id=body.class_id,
        usn=body.usn,
        name=body.name,
        phone=body.phone,
        address=body.address,
        dob=body.dob,
        sex=body.sex,
    )
    db.add(student)
    await db.flush()

    result = await db.execute(
        select(Student)
        .options(selectinload(Student.class_).selectinload(Class.department))
        .where(Student.id == student.id)
    )
    return result.scalar_one()


@router.put("/students/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: int,
    body: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Student not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(student, k, v)
    await db.flush()
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.class_).selectinload(Class.department))
        .where(Student.id == student_id)
    )
    return result.scalar_one()


@router.delete("/students/{student_id}", status_code=204)
async def delete_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Student not found")
    user_result = await db.execute(select(User).where(User.id == student.user_id))
    user = user_result.scalar_one_or_none()
    await db.delete(student)
    if user:
        await db.delete(user)


# ---------------------------------------------------------------------------
# Teacher-Course assignments
# ---------------------------------------------------------------------------

@router.get("/assignments", response_model=list[TeacherCourseOut])
async def list_assignments(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(TeacherCourse).options(
            selectinload(TeacherCourse.teacher),
            selectinload(TeacherCourse.course),
            selectinload(TeacherCourse.class_).selectinload(Class.department),
        )
    )
    return result.scalars().all()


@router.post("/assignments", response_model=TeacherCourseOut, status_code=201)
async def assign_teacher_course(
    body: TeacherCourseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    tc = TeacherCourse(**body.model_dump())
    db.add(tc)
    await db.flush()
    result = await db.execute(
        select(TeacherCourse).options(
            selectinload(TeacherCourse.teacher),
            selectinload(TeacherCourse.course),
            selectinload(TeacherCourse.class_).selectinload(Class.department),
        ).where(TeacherCourse.id == tc.id)
    )
    return result.scalar_one()


@router.delete("/assignments/{assignment_id}", status_code=204)
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(TeacherCourse).where(TeacherCourse.id == assignment_id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise HTTPException(404, "Assignment not found")
    await db.delete(tc)


# ---------------------------------------------------------------------------
# Student-Course enrollments
# ---------------------------------------------------------------------------

@router.post("/enrollments", response_model=StudentCourseOut, status_code=201)
async def enroll_student(
    body: StudentCourseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    sc = StudentCourse(**body.model_dump())
    db.add(sc)
    await db.flush()
    result = await db.execute(
        select(StudentCourse)
        .options(selectinload(StudentCourse.course))
        .where(StudentCourse.id == sc.id)
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Leave management
# ---------------------------------------------------------------------------

@router.get("/leaves", response_model=list[LeaveOut])
async def list_leaves(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Leave).options(
            selectinload(Leave.teacher).selectinload(Teacher.department)
        )
    )
    return result.scalars().all()


@router.put("/leaves/{leave_id}", response_model=LeaveOut)
async def update_leave_status(
    leave_id: int,
    body: LeaveStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from datetime import datetime, timezone
    result = await db.execute(select(Leave).where(Leave.id == leave_id))
    leave = result.scalar_one_or_none()
    if not leave:
        raise HTTPException(404, "Leave not found")
    leave.status = body.status
    leave.resolved_at = datetime.now(timezone.utc)
    leave.resolved_by = admin.id
    await db.flush()
    result = await db.execute(
        select(Leave)
        .options(selectinload(Leave.teacher).selectinload(Teacher.department))
        .where(Leave.id == leave_id)
    )
    return result.scalar_one()


# ---------------------------------------------------------------------------
# Notices
# ---------------------------------------------------------------------------

@router.get("/notices", response_model=list[NoticeOut])
async def list_notices(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Notice).order_by(Notice.created_at.desc())
    )
    return result.scalars().all()


@router.post("/notices", response_model=NoticeOut, status_code=201)
async def create_notice(
    body: NoticeCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    notice = Notice(**body.model_dump(), created_by=admin.id)
    db.add(notice)
    await db.flush()
    await db.refresh(notice)
    return notice


@router.delete("/notices/{notice_id}", status_code=204)
async def delete_notice(
    notice_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Notice).where(Notice.id == notice_id))
    notice = result.scalar_one_or_none()
    if not notice:
        raise HTTPException(404, "Notice not found")
    await db.delete(notice)
