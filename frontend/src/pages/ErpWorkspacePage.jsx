import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { erpAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Moon,
  Plus,
  Sun,
  UserCheck,
  Users,
} from 'lucide-react'

const COLORS = ['#1e40af', '#0891b2', '#10b981', '#f59e0b', '#ef4444', '#7c3aed']

const FALLBACK_DASHBOARD = {
  cards: {
    totalStudents: 0,
    totalFaculty: 0,
    totalDepartments: 0,
    totalSubjects: 0,
    attendancePercentage: 0,
    passPercentage: 0,
    lowAttendanceStudents: 0,
    failedStudents: 0,
    topPerformingStudents: 0,
    upcomingExams: 0,
  },
  departmentWiseStudents: [],
  attendanceAnalytics: [],
  semesterResultAnalytics: [],
  notifications: [],
  studentDirectory: [],
  facultyDirectory: [],
  topPerformingStudents: [],
  failedStudents: [],
  facultyWorkload: [],
  upcomingExams: [],
  attendanceViews: [],
  resultViews: [],
  adminCanAdd: [],
  erpFeatures: [],
  moduleStructure: [],
}

export default function ErpWorkspacePage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [filters, setFilters] = useState({ branch: 'All', semester: 'All', year: 'All', section: 'All' })
  const [page, setPage] = useState(1)
  const [mode, setMode] = useState('light')

  useEffect(() => {
    erpAPI.dashboard()
      .then(res => setDashboard(res.data.data))
      .catch(() => setDashboard(FALLBACK_DASHBOARD))
  }, [])

  const data = dashboard || FALLBACK_DASHBOARD
  const cards = data.cards || {}
  const role = user?.role || 'ADMIN'
  const isAdmin = role === 'ADMIN'
  const pageSize = 5

  const dashboardCards = useMemo(() => [
    { label: 'Total Students', value: cards.totalStudents || 0, helper: 'Overall student count', icon: GraduationCap, tone: '#1e40af' },
    { label: 'Total Faculty', value: cards.totalFaculty || 0, helper: 'Faculty count', icon: UserCheck, tone: '#0891b2' },
    { label: 'Departments', value: cards.totalDepartments || 0, helper: 'Department analytics', icon: Building2, tone: '#10b981' },
    { label: 'Attendance', value: `${cards.attendancePercentage || 0}%`, helper: 'Overall attendance', icon: ClipboardCheck, tone: '#f59e0b' },
    { label: 'Pass %', value: `${cards.passPercentage || 0}%`, helper: 'Result analytics', icon: FileText, tone: '#7c3aed' },
    { label: 'Low Attendance', value: cards.lowAttendanceStudents || 0, helper: 'Below 75% warning', icon: ClipboardCheck, tone: '#ef4444' },
    { label: 'Failed Students', value: cards.failedStudents || 0, helper: 'Backlog monitoring', icon: FileText, tone: '#b91c1c' },
    { label: 'Top Performers', value: cards.topPerformingStudents || 0, helper: 'Highest academic performers', icon: GraduationCap, tone: '#047857' },
    { label: 'Upcoming Exams', value: cards.upcomingExams || 0, helper: 'Academic tracking', icon: CalendarDays, tone: '#0f766e' },
    { label: 'Subjects', value: cards.totalSubjects || 0, helper: 'Curriculum records', icon: BookOpen, tone: '#334155' },
  ], [cards])

  const filterOptions = useMemo(() => {
    const students = data.studentDirectory || []
    const unique = key => ['All', ...Array.from(new Set(students.map(student => student[key]).filter(Boolean)))]
    return {
      branch: unique('branch'),
      semester: unique('semester'),
      year: unique('academicYear'),
      section: unique('section'),
    }
  }, [data.studentDirectory])

  const filteredStudents = useMemo(() => {
    return (data.studentDirectory || []).filter(student => {
      const matchesBranch = filters.branch === 'All' || student.branch === filters.branch
      const matchesSemester = filters.semester === 'All' || student.semester === filters.semester
      const matchesYear = filters.year === 'All' || student.academicYear === filters.year
      const matchesSection = filters.section === 'All' || student.section === filters.section
      return matchesBranch && matchesSemester && matchesYear && matchesSection
    })
  }, [data.studentDirectory, filters])

  const pagedStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [filters])

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const exportCsv = () => {
    const headers = ['Student ID', 'Full Name', 'Department', 'Branch', 'Semester', 'Section', 'Academic Year', 'Email', 'Phone', 'Attendance', 'SGPA/CGPA', 'Fee Status', 'Parent Details', 'Login Status']
    const rows = filteredStudents.map(student => headers.map(header => {
      const key = {
        'Student ID': 'studentId',
        'Full Name': 'fullName',
        Department: 'department',
        Branch: 'branch',
        Semester: 'semester',
        Section: 'section',
        'Academic Year': 'academicYear',
        Email: 'email',
        Phone: 'phone',
        Attendance: 'attendancePercentage',
        'SGPA/CGPA': 'sgpaCgpa',
        'Fee Status': 'feeStatus',
        'Parent Details': 'parentDetails',
        'Login Status': 'loginStatus',
      }[header]
      return `"${String(student[key] || '').replaceAll('"', '""')}"`
    }).join(','))
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'admin-student-directory.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`erp-workspace ${mode === 'dark' ? 'erp-dark' : ''}`}>
      <div className="erp-command-bar">
        <div>
          <div className="eyebrow">Admin Module in Real College ERP Portal</div>
          <h1>{role.charAt(0) + role.slice(1).toLowerCase()} Portal</h1>
          <p>Central authority for students, faculty, departments, subjects, attendance, results, timetable, reports, analytics, notifications, and settings.</p>
        </div>
        <div className="erp-command-actions">
          <button className="btn btn-ghost" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} title="Toggle theme">
            {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {mode === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      <div className="admin-card-grid">
        {dashboardCards.map(card => {
          const Icon = card.icon
          return (
            <div className="stat-card" style={{ '--accent-color': card.tone, '--accent-bg': `${card.tone}18` }} key={card.label}>
              <div className="stat-icon"><Icon size={22} /></div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
              <div className="table-subtext">{card.helper}</div>
            </div>
          )
        })}
      </div>

      <div className="erp-split">
        <section className="card">
          <div className="section-title">
            <div>
              <h3>Department-wise Students</h3>
              <p>Admin can see department and branch distribution.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.departmentWiseStudents || []} cx="50%" cy="48%" innerRadius={64} outerRadius={96} dataKey="value" paddingAngle={4}>
                {(data.departmentWiseStudents || []).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend iconSize={9} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <div className="section-title">
            <div>
              <h3>Attendance Analytics</h3>
              <p>Branch-wise attendance percentage and low attendance monitoring.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.attendanceAnalytics || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="percentage" fill="#0891b2" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="card erp-table-card">
        <div className="table-card-header">
          <div>
            <h3>Student Details Admin Can See</h3>
            <p>Complete student information with attendance, SGPA/CGPA, fee status, parent details, and login status.</p>
          </div>
          <div className="erp-row-actions">
            <select className="form-select" value={filters.branch} onChange={event => setFilter('branch', event.target.value)} title="Branch filter">
              {filterOptions.branch.map(item => <option key={item}>{item === 'All' ? 'All Branches' : item}</option>)}
            </select>
            <select className="form-select" value={filters.semester} onChange={event => setFilter('semester', event.target.value)} title="Semester filter">
              {filterOptions.semester.map(item => <option key={item}>{item === 'All' ? 'All Semesters' : item}</option>)}
            </select>
            <select className="form-select" value={filters.year} onChange={event => setFilter('year', event.target.value)} title="Academic year filter">
              {filterOptions.year.map(item => <option key={item}>{item === 'All' ? 'All Years' : item}</option>)}
            </select>
            <select className="form-select" value={filters.section} onChange={event => setFilter('section', event.target.value)} title="Section filter">
              {filterOptions.section.map(item => <option key={item}>{item === 'All' ? 'All Sections' : item}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={exportCsv}><FileSpreadsheet size={15} /> Excel</button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Download size={15} /> PDF</button>
          </div>
        </div>
        <div className="table-wrap erp-student-table">
          <table>
            <thead>
              <tr>
                <th>Student ID / USN</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Branch</th>
                <th>Semester</th>
                <th>Section</th>
                <th>Academic Year</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Attendance</th>
                <th>SGPA / CGPA</th>
                <th>Fee</th>
                <th>Parent</th>
                <th>Login</th>
              </tr>
            </thead>
            <tbody>
              {pagedStudents.map(student => (
                <tr key={student.studentId}>
                  <td className="mono erp-usn">{student.studentId}</td>
                  <td>{student.fullName}</td>
                  <td>{student.department}</td>
                  <td>{student.branch}</td>
                  <td>{student.semester}</td>
                  <td>{student.section}</td>
                  <td>{student.academicYear}</td>
                  <td>{student.email}</td>
                  <td>{student.phone}</td>
                  <td><span className={`badge ${parseFloat(student.attendancePercentage) >= 75 ? 'badge-green' : 'badge-red'}`}>{student.attendancePercentage}</span></td>
                  <td>{student.sgpaCgpa}</td>
                  <td><span className={`badge ${student.feeStatus === 'Paid' ? 'badge-green' : 'badge-yellow'}`}>{student.feeStatus}</span></td>
                  <td>{student.parentDetails}</td>
                  <td><span className={`badge ${student.loginStatus === 'Active' ? 'badge-green' : 'badge-gray'}`}>{student.loginStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="erp-pagination">
          <span>Showing {pagedStudents.length} of {filteredStudents.length} students</span>
          <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} / {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </section>

      <div className="erp-split" style={{ marginTop: 20 }}>
        <InfoTable title="Faculty Details Admin Can See" subtitle="Faculty ID, department, assigned subjects, contact, classes taken, and reports." rows={data.facultyDirectory || []} columns={[
          ['facultyId', 'Faculty ID'],
          ['facultyName', 'Faculty Name'],
          ['department', 'Department'],
          ['assignedSubjects', 'Assigned Subjects'],
          ['contactDetails', 'Contact Details'],
          ['attendanceClassesTaken', 'Classes Taken'],
          ['performanceReports', 'Performance Reports'],
        ]} />
        <InfoTable title="Result Details Admin Can See" subtitle="Subject, semester, year, student performance, toppers, backlogs, SGPA and CGPA." rows={data.resultViews || []} columns={[
          ['name', 'Result Feature'],
          ['description', 'Description'],
        ]} />
      </div>

      <div className="erp-split">
        <InfoTable title="Top Performing Students" subtitle="Highest average marks and SGPA/CGPA performers for admin analytics." rows={data.topPerformingStudents || []} columns={[
          ['studentName', 'Student'],
          ['rollNumber', 'USN'],
          ['branch', 'Branch'],
          ['averagePercentage', 'Average %'],
          ['sgpa', 'SGPA'],
        ]} />
        <InfoTable title="Failed / Backlog Students" subtitle="Students requiring result follow-up, revaluation, or backlog exam registration." rows={data.failedStudents || []} columns={[
          ['studentName', 'Student'],
          ['rollNumber', 'USN'],
          ['branch', 'Branch'],
          ['semester', 'Sem'],
          ['subject', 'Subject'],
          ['percentage', 'Marks %'],
          ['status', 'Status'],
        ]} />
      </div>

      <div className="erp-split">
        <InfoTable title="Faculty Dashboard Workload" subtitle="Assigned classes, attendance status, pending result uploads, and low attendance follow-up." rows={data.facultyWorkload || []} columns={[
          ['facultyId', 'Faculty ID'],
          ['facultyName', 'Faculty'],
          ['department', 'Department'],
          ['assignedClasses', 'Classes'],
          ['attendanceSummary', 'Attendance'],
          ['pendingResultUploads', 'Pending Results'],
          ['lowAttendanceStudents', 'Low Attendance'],
        ]} />
        <InfoTable title="Upcoming Exams" subtitle="Academic tracking for internal assessments, semester exams, practicals, and backlogs." rows={data.upcomingExams || []} columns={[
          ['name', 'Exam'],
          ['scope', 'Scope'],
          ['date', 'Date'],
          ['status', 'Status'],
        ]} />
      </div>

      <div className="erp-split">
        <section className="card">
          <div className="section-title">
            <div>
              <h3>Semester Result Analytics</h3>
              <p>Average SGPA by semester.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.semesterResultAnalytics || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="semester" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="averageSgpa" fill="#1e40af" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="card">
        <div className="section-title">
          <div>
            <h3>Notifications</h3>
            <p>College announcements, exam schedules, holidays, and attendance warnings.</p>
          </div>
          <FileText size={20} />
        </div>
        <div className="notification-list">
          {(data.notifications || []).map(item => (
            <div className={`erp-notification ${(item.type || '').toLowerCase()}`} key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.targetRole}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function InfoTable({ title, subtitle, rows, columns }) {
  return (
    <section className="card" style={{ padding: 0 }}>
      <div className="table-card-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map(([, label]) => <th key={label}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map(([key]) => <td key={key}>{row[key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
