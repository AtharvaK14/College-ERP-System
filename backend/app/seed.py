"""
Seed the database with realistic sample data for development/demo.
Run: python -m app.seed
"""

import asyncio
from datetime import date, timedelta
import random

from sqlalchemy import select

from app.core.security import hash_password
from app.database import engine, AsyncSessionLocal, Base
from app.models import (
    Attendance, AttendanceStatus, Class, Complaint, Course, Department,
    Leave, LeaveType, Marks, MarkType, Message, Notice,
    Sex, Student, StudentCourse, Teacher, TeacherCourse,
    User, UserRole,
)


async def seed():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        existing = (await db.execute(select(User))).first()
        if existing:
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")

        # ---- Admin user ----
        admin_user = User(
            username="admin",
            email="admin@sjce.edu",
            hashed_password=hash_password("admin123"),
            role=UserRole.admin,
        )
        db.add(admin_user)
        await db.flush()
        print("Created admin user (username: admin, password: admin123)")

        # ---- Departments ----
        depts = [
            Department(name="Computer Science & Engineering", code="CSE"),
            Department(name="Electronics & Communication", code="ECE"),
            Department(name="Mechanical Engineering", code="ME"),
        ]
        for d in depts:
            db.add(d)
        await db.flush()

        # ---- Classes ----
        classes = [
            Class(department_id=depts[0].id, semester=5, section="A"),
            Class(department_id=depts[0].id, semester=5, section="B"),
            Class(department_id=depts[0].id, semester=7, section="A"),
        ]
        for c in classes:
            db.add(c)
        await db.flush()

        # ---- Courses ----
        courses = [
            Course(name="Database Management Systems", shortname="DBMS", department_id=depts[0].id, credits=4),
            Course(name="Operating Systems", shortname="OS", department_id=depts[0].id, credits=4),
            Course(name="Computer Networks", shortname="CN", department_id=depts[0].id, credits=3),
            Course(name="Software Engineering", shortname="SE", department_id=depts[0].id, credits=3),
        ]
        for c in courses:
            db.add(c)
        await db.flush()

        # ---- Teachers ----
        teacher_data = [
            ("prof.manimala", "manimala@sjce.edu", "Prof. Manimala", "9876543210"),
            ("prof.divakar", "divakar@sjce.edu", "Prof. Divakar", "9876543211"),
        ]
        teachers = []
        for username, email, name, phone in teacher_data:
            u = User(
                username=username,
                email=email,
                hashed_password=hash_password("teacher123"),
                role=UserRole.teacher,
            )
            db.add(u)
            await db.flush()
            t = Teacher(
                user_id=u.id,
                department_id=depts[0].id,
                name=name,
                phone=phone,
                sex=Sex.female if "manimala" in username else Sex.male,
                dob=date(1980, 3, 15),
            )
            db.add(t)
            await db.flush()
            teachers.append(t)
        print("Created 2 teachers (password: teacher123)")

        # ---- Assign teachers to courses+classes ----
        assignments = [
            TeacherCourse(teacher_id=teachers[0].id, course_id=courses[0].id, class_id=classes[0].id, day="Monday", time_slot="09:00-10:00"),
            TeacherCourse(teacher_id=teachers[0].id, course_id=courses[1].id, class_id=classes[0].id, day="Tuesday", time_slot="10:00-11:00"),
            TeacherCourse(teacher_id=teachers[1].id, course_id=courses[2].id, class_id=classes[0].id, day="Wednesday", time_slot="11:00-12:00"),
            TeacherCourse(teacher_id=teachers[1].id, course_id=courses[3].id, class_id=classes[0].id, day="Thursday", time_slot="14:00-15:00"),
        ]
        for a in assignments:
            db.add(a)
        await db.flush()

        # ---- Students ----
        student_names = [
            ("1SI21CS001", "Arjun Sharma"),
            ("1SI21CS002", "Priya Nair"),
            ("1SI21CS003", "Rahul Verma"),
            ("1SI21CS004", "Kavitha Reddy"),
            ("1SI21CS005", "Mohammed Siddiqui"),
        ]
        students = []
        for usn, name in student_names:
            username = usn.lower()
            u = User(
                username=username,
                email=f"{username}@sjce.edu",
                hashed_password=hash_password("student123"),
                role=UserRole.student,
            )
            db.add(u)
            await db.flush()
            s = Student(
                user_id=u.id,
                class_id=classes[0].id,
                usn=usn,
                name=name,
                phone=f"98{random.randint(10000000, 99999999)}",
                address="Mysuru, Karnataka",
                dob=date(2003, random.randint(1, 12), random.randint(1, 28)),
                sex=random.choice([Sex.male, Sex.female]),
            )
            db.add(s)
            await db.flush()
            students.append(s)
            # Enroll in all 4 courses
            for course in courses:
                db.add(StudentCourse(student_id=s.id, course_id=course.id))
        await db.flush()
        print("Created 5 students (password: student123, usernames: 1si21cs001 through 1si21cs005)")

        # ---- Attendance (past 30 days for each student+course) ----
        today = date.today()
        for student in students:
            for course in courses:
                for days_ago in range(30, 0, -1):
                    att_date = today - timedelta(days=days_ago)
                    if att_date.weekday() >= 5:  # Skip weekends
                        continue
                    status = AttendanceStatus.present if random.random() > 0.2 else AttendanceStatus.absent
                    db.add(Attendance(
                        student_id=student.id,
                        course_id=course.id,
                        date=att_date,
                        status=status,
                    ))
        await db.flush()

        # ---- Marks (CIE 1-3 for each student+course) ----
        for student in students:
            for course in courses:
                for mark_type in [MarkType.CIE1, MarkType.CIE2, MarkType.CIE3]:
                    db.add(Marks(
                        student_id=student.id,
                        course_id=course.id,
                        mark_type=mark_type,
                        marks_scored=random.randint(25, 50),
                        total_marks=50,
                    ))
        await db.flush()

        # ---- Leave applications ----
        db.add(Leave(
            teacher_id=teachers[0].id,
            leave_type=LeaveType.medical,
            from_date=today + timedelta(days=3),
            to_date=today + timedelta(days=5),
            reason="Medical checkup",
        ))

        # ---- Notices ----
        for i, (title, content) in enumerate([
            ("Mid-semester examination schedule", "CIE 4 examinations will be held from next Monday. Check the timetable on the notice board."),
            ("Holiday notice", "The college will remain closed on account of the state formation day."),
            ("Project submission deadline", "Final project reports must be submitted by the end of this month."),
        ]):
            db.add(Notice(title=title, content=content, created_by=admin_user.id))

        # ---- Sample complaint + message ----
        if students:
            db.add(Complaint(
                student_id=students[0].id,
                teacher_id=teachers[0].id,
                subject="Doubt in DBMS normalization",
                message="I have a question regarding 3NF and BCNF. Could you please provide additional resources?",
            ))
            db.add(Message(
                sender_id=students[0].user_id,
                receiver_id=None,
                is_forum=True,
                content="Anyone else having trouble with the OS assignment? Can we form a study group?",
            ))

        await db.commit()
        print("\n=== Seed complete ===")
        print("Admin:    admin / admin123")
        print("Teachers: prof.manimala / teacher123   |   prof.divakar / teacher123")
        print("Students: 1si21cs001 through 1si21cs005 / student123")


if __name__ == "__main__":
    asyncio.run(seed())
