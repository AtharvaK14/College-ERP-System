# NGIFOE ERP System

## Overview

The NGIFOE ERP System is a comprehensive College Information Management System developed using the Django framework. It is designed to facilitate seamless interaction between students, teachers, and administrators by centralizing and automating key college management functions such as attendance, marks, and timetable management. The system addresses the challenges of manual data handling in educational institutions, providing a smart, efficient, and secure platform to manage college operations from anywhere through a unified dashboard.

## Features

- **Role-Based Access**: Separate interfaces and functionalities for Students, Teachers, and Administrators.
- **Student Profile Management**: Students can view and update their personal details including attendance, marks, and timetable.
- **Teacher Management**: Teachers can record, edit, and finalize attendance and marks; manage extra classes and view timetables; assign substitute teachers when needed.
- **Administrator Controls**: Admins can add, edit, and manage student and staff records, oversee system data integrity, and generate reports.
- **Attendance Management**: Enables teachers to enter and modify attendance records before locking them, reducing errors.
- **Marks Management**: Facilitates entry and editing of marks with finalization options.
- **Timetable Management**: Provides scheduling and viewing of class timetables for all users.
- **Reports Generation**: Teachers and admins can generate detailed reports for monitoring academic progress.
- **Security**: Robust security measures to protect sensitive data and ensure privacy.
- **User-Friendly Interface**: Intuitive and minimal learning curve for efficient use.

## Motivation

Managing college data manually is time-consuming and prone to errors. Different departments often operate in silos with separate systems, causing inefficiencies and data inconsistencies. This project was motivated by the need to develop a centralized ERP system that integrates various college functions, reduces data errors, and improves accessibility and management of student and staff information.

## Technologies Used

- **Backend**: Django (Python)
- **Database**: MySQL (or SQLite for development)
- **Frontend**: HTML, CSS, JavaScript (Django Templates)
- **Others**: Bootstrap or similar CSS framework (if applicable)

## How to Run the Project

### Prerequisites

- Python 3.x installed
- MySQL server installed and running (if using MySQL)
- pip package manager
- Git (optional)

### Installation Steps

1. **Clone the repository** (if available):
   ```bash
   git clone 
   cd 
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
   *(If `requirements.txt` is not provided, install Django manually: `pip install django`)*

4. **Configure database settings**:
   - Update `settings.py` with your MySQL database credentials.
   - Alternatively, use SQLite for initial testing.

5. **Apply migrations**:
   ```bash
   python manage.py migrate
   ```

6. **Create a superuser for admin access**:
   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server**:
   ```bash
   python manage.py runserver
   ```

8. **Access the application**:
   Open a web browser and navigate to `http://127.0.0.1:8000/`

### Usage

- **Administrator**: Manage student and staff records, generate reports, and oversee system operations.
- **Teacher**: Manage attendance, marks, timetables, and assign extra classes.
- **Student**: View personal profile, attendance, marks, and timetable.

## Project Structure

- `manage.py` - Django management script
- `/` - Django app containing models, views, templates, and static files
- `templates/` - HTML templates for UI
- `static/` - CSS, JS, images
- `db.sqlite3` or MySQL database - Data storage

## Testing

The system underwent various testing methods including:

- White Box Testing
- Black Box Testing
- Acceptance Testing

All tests showed positive results, confirming system reliability and functionality.

## Contributors

- Abhishek Pawar (72174170D)
- Atharva Kadam (72174157G)
- Samyag Shah (72174180M)

Under the guidance of Prof. N.M. Dimble, Department of Computer Engineering, NGIFOE, Pune.

## Acknowledgments

We express our sincere gratitude to our guide Prof. N.M. Dimble, project coordinator Prof. B.M. Borhade, Head of Department Prof. C.S. Wagh, and all faculty members for their valuable support and guidance throughout the project.

---

This README provides a thorough description of your NGIFOE ERP System project, its features, motivation, and instructions for setup and usage, suitable for your GitHub repository[1]. If you need, I can help you add screenshots or further deployment instructions.

[1] https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/14477163/75dadbc0-a1f7-4c24-9195-deae217ff241/BE_PROJECT_STAGE_II_Report_Final.pdf
