import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('sms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sms_token')
      localStorage.removeItem('sms_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const studentAPI = {
  getAll: () => api.get('/students'),
  search: (params) => api.get('/students/search', { params }),
  filters: () => api.get('/students/filters'),
  analytics: () => api.get('/students/analytics'),
  search: (params) => api.get('/students/search', { params }),
  filters: () => api.get('/students/filters'),
  analytics: () => api.get('/students/analytics'),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  getByCourse: (courseId) => api.get(`/students/course/${courseId}`),
  getProfile: () => api.get('/students/profile'),
  updateMySection: (data) => api.put('/students/profile/section', data),
  registerSubjects: (data) => api.post('/students/profile/subjects', data),
}

export const courseAPI = {
  getAll: () => api.get('/courses'),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
}

export const attendanceAPI = {
  mark: (data) => api.post('/attendance', data),
  markBulk: (data) => api.post('/attendance/bulk', data),
  getByStudent: (id) => api.get(`/attendance/student/${id}`),
  getSummary: (id) => api.get(`/attendance/summary/${id}`),
  getMy: () => api.get('/attendance/my'),
  getMySummary: () => api.get('/attendance/my/summary'),
}

export const resultAPI = {
  add: (data) => api.post('/results', data),
  getByStudent: (id) => api.get(`/results/student/${id}`),
  getBySemester: (studentId, sem) => api.get(`/results/student/${studentId}/semester/${sem}`),
  getReport: (id) => api.get(`/results/report/${id}`),
  update: (id, data) => api.put(`/results/${id}`, data),
  share: (data) => api.post('/results/share', data),
  getMy: () => api.get('/results/my'),
}

export const notificationAPI = {
  getMy: () => api.get('/notifications'),
}

export const authAPI = {
  changePassword: (data) => api.post('/auth/change-password', data),
}

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
}

export const userAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
}

export const erpAPI = {
  dashboard: () => api.get('/erp/dashboard'),
  departments: () => api.get('/erp/departments'),
  saveDepartment: (data) => api.post('/erp/departments', data),
  branches: () => api.get('/erp/branches'),
  saveBranch: (data) => api.post('/erp/branches', data),
  semesters: () => api.get('/erp/semesters'),
  saveSemester: (data) => api.post('/erp/semesters', data),
  subjects: () => api.get('/erp/subjects'),
  saveSubject: (data) => api.post('/erp/subjects', data),
  faculty: () => api.get('/erp/faculty'),
  saveFaculty: (data) => api.post('/erp/faculty', data),
  saveFacultyWithAssignment: (data) => api.post('/erp/faculty-with-assignment', data),
  updateFacultyWithAssignment: (id, data) => api.put(`/erp/faculty-with-assignment/${id}`, data),
  deleteFacultyAssignment: (id) => api.delete(`/erp/faculty-with-assignment/${id}`),
  assignments: () => api.get('/erp/assignments'),
  saveAssignment: (data) => api.post('/erp/assignments', data),
  timetable: () => api.get('/erp/timetable'),
  saveTimetable: (data) => api.post('/erp/timetable', data),
  attendanceRecords: () => api.get('/erp/attendance-records'),
  saveAttendanceRecord: (data) => api.post('/erp/attendance-records', data),
  attendanceReport: (params) => api.get('/erp/attendance-report', { params }),
  academicResults: () => api.get('/erp/academic-results'),
  saveAcademicResult: (data) => api.post('/erp/academic-results', data),
  academicYears: () => api.get('/erp/academic-years'),
  saveAcademicYear: (data) => api.post('/erp/academic-years', data),
  feesByStudent: (studentId) => api.get(`/erp/fees/student/${studentId}`),
  leaveRequests: () => api.get('/erp/leave-requests'),
  saveLeaveRequest: (data) => api.post('/erp/leave-requests', data),
}

export const reportAPI = {
  subjectWiseAttendance: (params) => api.get('/reports/attendance/subject-wise', { params }),
  lowAttendance: (params) => api.get('/reports/attendance/low', { params }),
  yearWiseAttendance: () => api.get('/reports/attendance/year-wise'),
  semesterWiseAttendance: () => api.get('/reports/attendance/semester-wise'),
  semesterWiseResults: (params) => api.get('/reports/results/semester-wise', { params }),
  yearWiseResults: () => api.get('/reports/results/year-wise'),
  resultStudents: (params) => api.get('/reports/results/students', { params }),
}

export const demoAPI = {
  seed: () => api.post('/demo/seed'),
  counts: () => api.get('/demo/counts'),
}

export default api
