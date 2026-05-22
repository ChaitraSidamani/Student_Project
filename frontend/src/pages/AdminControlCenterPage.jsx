import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AlertTriangle, BookOpen, Building2, CalendarDays, ClipboardCheck,
  CreditCard, Download, FileSpreadsheet, FileText, GraduationCap, ShieldCheck, UserCog, Users
} from 'lucide-react'
import { courseAPI, erpAPI, reportAPI, studentAPI, userAPI } from '../services/api'

const COLORS = ['#1e40af', '#0891b2', '#10b981', '#f59e0b', '#ef4444', '#7c3aed']

const DEFAULT_ANALYTICS = {
  totalStudents: 0,
  totalFaculty: 0,
  totalDepartments: 0,
  averageAttendance: 0,
  passPercentage: 0,
  low60: 0,
  low75: 0,
  failedStudents: 0,
  topPerformingStudents: 0,
  upcomingExams: 0,
  departmentCounts: [],
  attendance: [],
  results: [],
  recent: [],
}

export default function AdminControlCenterPage() {
  const [analytics, setAnalytics] = useState(DEFAULT_ANALYTICS)
  const [students, setStudents] = useState([])
  const [faculty, setFaculty] = useState([])
  const [courses, setCourses] = useState([])
  const [lowAttendance, setLowAttendance] = useState([])
  const [erpDashboard, setErpDashboard] = useState(null)

  useEffect(() => {
    studentAPI.analytics().then(res => {
      const data = res.data.data
      setAnalytics(prev => ({
        ...prev,
        totalStudents: data.totalStudents,
        averageAttendance: data.averageAttendance,
        passPercentage: data.passPercentage,
        departmentCounts: data.departmentCounts || prev.departmentCounts,
        attendance: data.attendanceByDepartment || prev.attendance,
        low75: data.lowAttendanceCount || prev.low75,
      }))
    }).catch(() => {})
    studentAPI.search({ page: 0, size: 6, sortBy: 'createdAt', sortDir: 'desc' }).then(res => setStudents(res.data.data.content || [])).catch(() => {})
    userAPI.getAll().then(res => {
      const rows = res.data.data || []
      setFaculty(rows.filter(user => user.role === 'FACULTY'))
      setAnalytics(prev => ({ ...prev, totalFaculty: rows.filter(user => user.role === 'FACULTY').length || prev.totalFaculty }))
    }).catch(() => {})
    courseAPI.getAll().then(res => setCourses(res.data.data || [])).catch(() => {})
    reportAPI.lowAttendance({ threshold: 75 }).then(res => setLowAttendance(res.data.data || [])).catch(() => setLowAttendance([]))
    erpAPI.dashboard().then(res => {
      const data = res.data.data
      setErpDashboard(data)
      setAnalytics(prev => ({
        ...prev,
        failedStudents: data.cards?.failedStudents ?? prev.failedStudents,
        topPerformingStudents: data.cards?.topPerformingStudents ?? prev.topPerformingStudents,
        upcomingExams: data.cards?.upcomingExams ?? prev.upcomingExams,
      }))
    }).catch(() => {})
  }, [])

  const cards = [
    { label: 'Total Students', value: analytics.totalStudents, icon: GraduationCap, tone: '#1e40af' },
    { label: 'Total Faculty', value: analytics.totalFaculty, icon: UserCog, tone: '#0891b2' },
    { label: 'Departments', value: analytics.totalDepartments, icon: Building2, tone: '#10b981' },
    { label: 'Avg Attendance', value: `${analytics.averageAttendance}%`, icon: ClipboardCheck, tone: '#f59e0b' },
    { label: 'Pass Percentage', value: `${analytics.passPercentage}%`, icon: FileSpreadsheet, tone: '#10b981' },
    { label: 'Below 75%', value: analytics.low75, icon: AlertTriangle, tone: '#ef4444' },
    { label: 'Failed Students', value: analytics.failedStudents, icon: FileText, tone: '#b91c1c' },
    { label: 'Top Performers', value: analytics.topPerformingStudents, icon: GraduationCap, tone: '#047857' },
    { label: 'Upcoming Exams', value: analytics.upcomingExams, icon: CalendarDays, tone: '#0f766e' },
  ]

  const exportReports = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      students: students.length,
      analytics: analytics,
      lowAttendanceCount: lowAttendance.length,
    }
    const csv = 'Report Generated,' + new Date().toISOString() + '\n\nANALYTICS\n' +
      `Total Students,${analytics.totalStudents}\n` +
      `Total Faculty,${analytics.totalFaculty}\n` +
      `Average Attendance %,${analytics.averageAttendance}\n` +
      `Pass Percentage,${analytics.passPercentage}\n` +
      `Below 75% Attendance,${analytics.low75}\n` +
      `Failed Students,${analytics.failedStudents}\n\n` +
      'LOW ATTENDANCE ALERTS\n' +
      'Student,Roll,Branch,Semester,Subject,Percentage\n' +
      lowAttendance.slice(0, 20).map(item => 
        `"${item.studentName}","${item.rollNumber}","${item.branch}",${item.semester},"${item.subject}",${item.percentage}`
      ).join('\n')
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv))
    element.setAttribute('download', `erp-report-${new Date().getTime()}.csv`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div>
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">Admin central authority</div>
          <h1>College ERP Admin Control Center</h1>
          <p>Manage students, faculty, attendance, results, analytics, subjects and academic operations from one dashboard.</p>
        </div>
        <button className="btn btn-primary" onClick={exportReports}><Download size={16} /> Export Reports</button>
      </div>

      <div className="admin-card-grid">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <div className="stat-card" style={{ '--accent-color': card.tone, '--accent-bg': `${card.tone}18` }} key={card.label}>
              <div className="stat-icon"><Icon size={22} /></div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          )
        })}
      </div>

      <div className="dashboard-charts">
        <section className="card">
          <div className="section-title">
            <div>
              <h3>Attendance Analytics</h3>
              <p>Branch and semester level attendance monitoring</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.attendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0891b2" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <div className="section-title">
            <div>
              <h3>Department-wise Strength</h3>
              <p>Students by department/course</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={analytics.departmentCounts} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={3}>
                {analytics.departmentCounts.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="dashboard-charts">
        <section className="card">
          <div className="section-title">
            <div>
              <h3>Year-wise Result Analytics</h3>
              <p>Pass percentage and average marks trend</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analytics.results}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area dataKey="pass" stroke="#10b981" fill="#10b98122" strokeWidth={2} />
              <Area dataKey="average" stroke="#1e40af" fill="#1e40af18" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <div className="section-title">
            <div>
              <h3>Low Attendance Warning List</h3>
              <p>Students below required attendance percentage</p>
            </div>
            <AlertTriangle size={20} />
          </div>
          <div className="notification-list">
            {lowAttendance.slice(0, 5).map(item => (
              <div className={`erp-notification ${Number(item.percentage) < 60 ? 'warning' : 'info'}`} key={`${item.rollNumber}-${item.subject}`}>
                <strong>{item.studentName} - {item.rollNumber}</strong>
                <span>{item.branch} Sem {item.semester} | {item.subject} | {item.percentage}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="erp-split">
        <MiniTable
          title="Top Performing Students"
          columns={['Student', 'USN', 'Branch', 'SGPA']}
          rows={(erpDashboard?.topPerformingStudents || []).slice(0, 5).map(row => [row.studentName, row.rollNumber, row.branch, row.sgpa])}
        />
        <MiniTable
          title="Failed / Backlog Students"
          columns={['Student', 'USN', 'Subject', 'Status']}
          rows={(erpDashboard?.failedStudents || []).slice(0, 5).map(row => [row.studentName, row.rollNumber, row.subject, row.status])}
        />
      </div>

      <div className="erp-split">
        <MiniTable
          title="Faculty Dashboard Workload"
          columns={['Faculty', 'Dept', 'Classes', 'Pending Results']}
          rows={(erpDashboard?.facultyWorkload || []).slice(0, 5).map(row => [row.facultyName, row.department, row.assignedClasses, row.pendingResultUploads])}
        />
        <MiniTable
          title="Upcoming Exams"
          columns={['Exam', 'Scope', 'Date', 'Status']}
          rows={(erpDashboard?.upcomingExams || []).slice(0, 5).map(row => [row.name, row.scope, row.date, row.status])}
        />
      </div>

      <div className="erp-split">
        <MiniTable
          title="Recent Students"
          columns={['Name', 'USN', 'Branch', 'Sem']}
          rows={students.slice(0, 6).map(student => [student.fullName, student.rollNumber, student.courseCode || student.courseName, student.semester ? `Sem ${student.semester}` : ''])}
        />
        <MiniTable
          title="Faculty Accounts"
          columns={['Faculty', 'Email', 'Role']}
          rows={faculty.slice(0, 6).map(user => [user.fullName, user.email, user.role])}
        />
      </div>

      <section className="card">
        <div className="section-title">
          <div>
            <h3>Recent Activities</h3>
            <p>Latest admin-controlled academic operations</p>
          </div>
        </div>
        <div className="notification-list">
          {analytics.recent.map(activity => (
            <div className="erp-notification success" key={activity}>
              <strong>{activity}</strong>
              <span>Admin activity log</span>
            </div>
          ))}
          <div className="erp-notification info">
            <strong>{courses.length} active courses available for assignment</strong>
            <span>Course and branch management</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function MiniTable({ title, columns, rows }) {
  return (
    <section className="card" style={{ padding: 0 }}>
      <div className="table-card-header">
        <div>
          <h3>{title}</h3>
          <p>Quick admin reference</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell || '-'}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </section>
  )
}
