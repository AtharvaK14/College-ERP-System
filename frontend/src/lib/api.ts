import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        if (!refresh) throw new Error('No refresh token')
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
          refresh_token: refresh,
        })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ---- Typed API calls ----

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  me: () => api.get('/api/auth/me'),
}

export const adminApi = {
  stats:         () => api.get('/api/admin/stats'),
  departments:   () => api.get('/api/admin/departments'),
  createDept:    (d: object) => api.post('/api/admin/departments', d),
  updateDept:    (id: number, d: object) => api.put(`/api/admin/departments/${id}`, d),
  deleteDept:    (id: number) => api.delete(`/api/admin/departments/${id}`),
  classes:       () => api.get('/api/admin/classes'),
  createClass:   (d: object) => api.post('/api/admin/classes', d),
  courses:       () => api.get('/api/admin/courses'),
  createCourse:  (d: object) => api.post('/api/admin/courses', d),
  updateCourse:  (id: number, d: object) => api.put(`/api/admin/courses/${id}`, d),
  deleteCourse:  (id: number) => api.delete(`/api/admin/courses/${id}`),
  teachers:      () => api.get('/api/admin/teachers'),
  createTeacher: (d: object) => api.post('/api/admin/teachers', d),
  deleteTeacher: (id: number) => api.delete(`/api/admin/teachers/${id}`),
  students:      () => api.get('/api/admin/students'),
  createStudent: (d: object) => api.post('/api/admin/students', d),
  deleteStudent: (id: number) => api.delete(`/api/admin/students/${id}`),
  assignments:   () => api.get('/api/admin/assignments'),
  createAssign:  (d: object) => api.post('/api/admin/assignments', d),
  deleteAssign:  (id: number) => api.delete(`/api/admin/assignments/${id}`),
  enroll:        (d: object) => api.post('/api/admin/enrollments', d),
  leaves:        () => api.get('/api/admin/leaves'),
  updateLeave:   (id: number, status: string) => api.put(`/api/admin/leaves/${id}`, { status }),
  notices:       () => api.get('/api/admin/notices'),
  createNotice:  (d: object) => api.post('/api/admin/notices', d),
  deleteNotice:  (id: number) => api.delete(`/api/admin/notices/${id}`),
}

export const teacherApi = {
  dashboard:     () => api.get('/api/teacher/dashboard'),
  myCourses:     () => api.get('/api/teacher/my-courses'),
  students:      (courseId: number, classId: number) =>
    api.get(`/api/teacher/courses/${courseId}/classes/${classId}/students`),
  getAttendance: (courseId: number, classId: number, date?: string) =>
    api.get('/api/teacher/attendance', { params: { course_id: courseId, class_id: classId, date } }),
  markAttendance:(d: object) => api.post('/api/teacher/attendance', d),
  getMarks:      (courseId: number, classId: number) =>
    api.get('/api/teacher/marks', { params: { course_id: courseId, class_id: classId } }),
  enterMarks:    (d: object) => api.post('/api/teacher/marks', d),
  myLeaves:      () => api.get('/api/teacher/leaves'),
  applyLeave:    (d: object) => api.post('/api/teacher/leaves', d),
  myComplaints:  () => api.get('/api/teacher/complaints'),
  respondComplaint: (id: number, d: object) => api.put(`/api/teacher/complaints/${id}`, d),
}

export const studentApi = {
  dashboard:       () => api.get('/api/student/dashboard'),
  profile:         () => api.get('/api/student/profile'),
  attendance:      () => api.get('/api/student/attendance'),
  attendanceDetail:(courseId: number) => api.get(`/api/student/attendance/${courseId}/detail`),
  marks:           () => api.get('/api/student/marks'),
  reportCard:      () => api.get('/api/student/report-card'),
  notices:         () => api.get('/api/student/notices'),
  complaints:      () => api.get('/api/student/complaints'),
  fileComplaint:   (d: object) => api.post('/api/student/complaints', d),
  messages:        () => api.get('/api/student/messages'),
  sendMessage:     (d: object) => api.post('/api/student/messages', d),
  forum:           () => api.get('/api/student/forum'),
  postForum:       (content: string) => api.post('/api/student/forum', { content, is_forum: true }),
}
