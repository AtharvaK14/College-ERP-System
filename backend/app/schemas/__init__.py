"""
All Pydantic v2 schemas for request/response validation.
"""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models import (
    UserRole, Sex, AttendanceStatus, MarkType,
    LeaveType, LeaveStatus, ComplaintStatus,
)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: int


class TokenRefresh(BaseModel):
    refresh_token: str


class LoginRequest(BaseModel):
    username: str
    password: str


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=10)


class DepartmentOut(BaseModel):
    id: int
    name: str
    code: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Class
# ---------------------------------------------------------------------------

class ClassCreate(BaseModel):
    department_id: int
    semester: int = Field(..., ge=1, le=8)
    section: str = Field(..., max_length=5)


class ClassOut(BaseModel):
    id: int
    department_id: int
    semester: int
    section: str
    department: Optional[DepartmentOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Course
# ---------------------------------------------------------------------------

class CourseCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    shortname: str = Field(..., max_length=20)
    department_id: int
    credits: int = Field(4, ge=1, le=10)


class CourseOut(BaseModel):
    id: int
    name: str
    shortname: str
    department_id: int
    credits: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Teacher
# ---------------------------------------------------------------------------

class TeacherCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    department_id: int
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None
    sex: Optional[Sex] = None


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None
    sex: Optional[Sex] = None
    department_id: Optional[int] = None


class TeacherOut(BaseModel):
    id: int
    user_id: int
    department_id: int
    name: str
    phone: Optional[str]
    address: Optional[str]
    dob: Optional[date]
    sex: Optional[Sex]
    department: Optional[DepartmentOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------

class StudentCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    class_id: int
    usn: str = Field(..., min_length=3, max_length=20)
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None
    sex: Optional[Sex] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None
    sex: Optional[Sex] = None
    class_id: Optional[int] = None


class StudentOut(BaseModel):
    id: int
    user_id: int
    class_id: int
    usn: str
    name: str
    phone: Optional[str]
    address: Optional[str]
    dob: Optional[date]
    sex: Optional[Sex]
    class_: Optional[ClassOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# TeacherCourse assignment
# ---------------------------------------------------------------------------

class TeacherCourseCreate(BaseModel):
    teacher_id: int
    course_id: int
    class_id: int
    day: Optional[str] = None
    time_slot: Optional[str] = None


class TeacherCourseOut(BaseModel):
    id: int
    teacher_id: int
    course_id: int
    class_id: int
    day: Optional[str]
    time_slot: Optional[str]
    teacher: Optional[TeacherOut] = None
    course: Optional[CourseOut] = None
    class_: Optional[ClassOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# StudentCourse enrollment
# ---------------------------------------------------------------------------

class StudentCourseCreate(BaseModel):
    student_id: int
    course_id: int


class StudentCourseOut(BaseModel):
    id: int
    student_id: int
    course_id: int
    course: Optional[CourseOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

class AttendanceRecord(BaseModel):
    student_id: int
    status: AttendanceStatus


class AttendanceBulkCreate(BaseModel):
    course_id: int
    date: date
    records: List[AttendanceRecord]


class AttendanceOut(BaseModel):
    id: int
    student_id: int
    course_id: int
    date: date
    status: AttendanceStatus

    model_config = {"from_attributes": True}


class AttendanceSummary(BaseModel):
    course_id: int
    course_name: str
    course_shortname: str
    attended: int
    total: int
    percentage: float
    below_threshold: bool   # True if < 75%


# ---------------------------------------------------------------------------
# Marks
# ---------------------------------------------------------------------------

class MarksCreate(BaseModel):
    student_id: int
    course_id: int
    mark_type: MarkType
    marks_scored: int = Field(..., ge=0)
    total_marks: int = Field(..., ge=1)

    @field_validator("marks_scored")
    @classmethod
    def scored_lte_total(cls, v, info):
        total = info.data.get("total_marks")
        if total is not None and v > total:
            raise ValueError("marks_scored cannot exceed total_marks")
        return v


class MarksBulkCreate(BaseModel):
    course_id: int
    mark_type: MarkType
    total_marks: int
    records: List[dict]   # [{student_id, marks_scored}]


class MarksOut(BaseModel):
    id: int
    student_id: int
    course_id: int
    mark_type: MarkType
    marks_scored: int
    total_marks: int

    model_config = {"from_attributes": True}


class ReportCard(BaseModel):
    student: StudentOut
    courses: List[dict]   # course + all marks + attendance summary
    cgpa: float


# ---------------------------------------------------------------------------
# Leave
# ---------------------------------------------------------------------------

class LeaveCreate(BaseModel):
    leave_type: LeaveType
    from_date: date
    to_date: date
    reason: Optional[str] = None

    @field_validator("to_date")
    @classmethod
    def to_after_from(cls, v, info):
        from_date = info.data.get("from_date")
        if from_date and v < from_date:
            raise ValueError("to_date must be on or after from_date")
        return v


class LeaveStatusUpdate(BaseModel):
    status: LeaveStatus


class LeaveOut(BaseModel):
    id: int
    teacher_id: int
    leave_type: LeaveType
    from_date: date
    to_date: date
    reason: Optional[str]
    status: LeaveStatus
    applied_at: datetime
    resolved_at: Optional[datetime]
    teacher: Optional[TeacherOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Notice
# ---------------------------------------------------------------------------

class NoticeCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str


class NoticeOut(BaseModel):
    id: int
    title: str
    content: str
    created_by: int
    created_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Complaint
# ---------------------------------------------------------------------------

class ComplaintCreate(BaseModel):
    teacher_id: int
    subject: str = Field(..., min_length=3, max_length=200)
    message: str


class ComplaintResponse(BaseModel):
    response: str
    status: ComplaintStatus = ComplaintStatus.resolved


class ComplaintOut(BaseModel):
    id: int
    student_id: int
    teacher_id: int
    subject: str
    message: str
    status: ComplaintStatus
    response: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Message / Forum
# ---------------------------------------------------------------------------

class MessageCreate(BaseModel):
    receiver_id: Optional[int] = None   # None = forum post
    content: str
    is_forum: bool = False


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: Optional[int]
    is_forum: bool
    content: str
    sent_at: datetime
    sender: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Dashboard summaries
# ---------------------------------------------------------------------------

class AdminStats(BaseModel):
    total_students: int
    total_teachers: int
    total_departments: int
    total_courses: int
    pending_leaves: int


class TeacherDashboard(BaseModel):
    teacher: TeacherOut
    assigned_courses: List[TeacherCourseOut]
    pending_leaves: int
    unresolved_complaints: int


class StudentDashboard(BaseModel):
    student: StudentOut
    attendance_summaries: List[AttendanceSummary]
    recent_notices: List[NoticeOut]
