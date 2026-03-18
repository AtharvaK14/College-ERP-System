"""
College ERP - All database models.
Entities from ERD: Department, Class, Teacher, Course, Student,
TeacherCourse (Assign), StudentCourse (enrollment), Attendance, Marks,
Leave, Notice, Complaint, Message.
"""

import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, ForeignKey,
    Integer, String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"


class MarkType(str, enum.Enum):
    CIE1 = "CIE1"
    CIE2 = "CIE2"
    CIE3 = "CIE3"
    CIE4 = "CIE4"
    CIE5 = "CIE5"
    SEE = "SEE"


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class LeaveType(str, enum.Enum):
    casual = "casual"
    medical = "medical"
    earned = "earned"
    other = "other"


class ComplaintStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"
    closed = "closed"


class Sex(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


# ---------------------------------------------------------------------------
# User (auth base for all roles)
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    # One-to-one back-references
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)
    student_profile = relationship("Student", back_populates="user", uselist=False)
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)

    classes = relationship("Class", back_populates="department")
    teachers = relationship("Teacher", back_populates="department")
    courses = relationship("Course", back_populates="department")


# ---------------------------------------------------------------------------
# Class (semester + section within a department)
# ---------------------------------------------------------------------------

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    semester = Column(Integer, nullable=False)        # 1-8
    section = Column(String(5), nullable=False)        # A, B, C ...

    __table_args__ = (
        UniqueConstraint("department_id", "semester", "section", name="uq_class"),
    )

    department = relationship("Department", back_populates="classes")
    students = relationship("Student", back_populates="class_")
    teacher_courses = relationship("TeacherCourse", back_populates="class_")


# ---------------------------------------------------------------------------
# Course
# ---------------------------------------------------------------------------

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    shortname = Column(String(20), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    credits = Column(Integer, default=4)

    department = relationship("Department", back_populates="courses")
    teacher_courses = relationship("TeacherCourse", back_populates="course")
    student_courses = relationship("StudentCourse", back_populates="course")
    attendances = relationship("Attendance", back_populates="course")
    marks = relationship("Marks", back_populates="course")


# ---------------------------------------------------------------------------
# Teacher
# ---------------------------------------------------------------------------

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(15))
    address = Column(String(255))
    dob = Column(Date)
    sex = Column(Enum(Sex))

    user = relationship("User", back_populates="teacher_profile")
    department = relationship("Department", back_populates="teachers")
    teacher_courses = relationship("TeacherCourse", back_populates="teacher")
    leaves = relationship("Leave", back_populates="teacher")


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    usn = Column(String(20), unique=True, nullable=False, index=True)   # University Seat Number
    name = Column(String(100), nullable=False)
    phone = Column(String(15))
    address = Column(String(255))
    dob = Column(Date)
    sex = Column(Enum(Sex))

    user = relationship("User", back_populates="student_profile")
    class_ = relationship("Class", back_populates="students")
    student_courses = relationship("StudentCourse", back_populates="student")
    attendances = relationship("Attendance", back_populates="student")
    marks = relationship("Marks", back_populates="student")
    complaints = relationship("Complaint", back_populates="student")


# ---------------------------------------------------------------------------
# TeacherCourse  (Assign in ERD: teacher assigned to course+class+timeslot)
# ---------------------------------------------------------------------------

class TeacherCourse(Base):
    __tablename__ = "teacher_courses"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    day = Column(String(10))        # Monday, Tuesday, ...
    time_slot = Column(String(20))  # e.g. "09:00-10:00"

    __table_args__ = (
        UniqueConstraint("teacher_id", "course_id", "class_id", name="uq_teacher_course_class"),
    )

    teacher = relationship("Teacher", back_populates="teacher_courses")
    course = relationship("Course", back_populates="teacher_courses")
    class_ = relationship("Class", back_populates="teacher_courses")


# ---------------------------------------------------------------------------
# StudentCourse  (enrollment)
# ---------------------------------------------------------------------------

class StudentCourse(Base):
    __tablename__ = "student_courses"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_student_course"),
    )

    student = relationship("Student", back_populates="student_courses")
    course = relationship("Course", back_populates="student_courses")


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", "date", name="uq_attendance"),
    )

    student = relationship("Student", back_populates="attendances")
    course = relationship("Course", back_populates="attendances")


# ---------------------------------------------------------------------------
# Marks
# ---------------------------------------------------------------------------

class Marks(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    mark_type = Column(Enum(MarkType), nullable=False)
    marks_scored = Column(Integer, nullable=False)
    total_marks = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", "mark_type", name="uq_marks"),
    )

    student = relationship("Student", back_populates="marks")
    course = relationship("Course", back_populates="marks")


# ---------------------------------------------------------------------------
# Leave (teacher leave requests)
# ---------------------------------------------------------------------------

class Leave(Base):
    __tablename__ = "leaves"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    leave_type = Column(Enum(LeaveType), nullable=False)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    reason = Column(Text)
    status = Column(Enum(LeaveStatus), default=LeaveStatus.pending)
    applied_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    teacher = relationship("Teacher", back_populates="leaves")


# ---------------------------------------------------------------------------
# Notice (admin broadcasts to all)
# ---------------------------------------------------------------------------

class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    is_active = Column(Boolean, default=True)


# ---------------------------------------------------------------------------
# Complaint (student -> teacher)
# ---------------------------------------------------------------------------

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.open)
    response = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("Student", back_populates="complaints")


# ---------------------------------------------------------------------------
# Message (student <-> teacher direct messaging / student forum)
# ---------------------------------------------------------------------------

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = forum post
    is_forum = Column(Boolean, default=False)
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")
