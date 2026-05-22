import { useEffect, useMemo, useState } from 'react'
import { dashboardAPI, erpAPI, reportAPI, studentAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  AlertTriangle, BookOpen, CalendarCheck, GraduationCap,
  TrendingUp, Users
} from 'lucide-react'

const FALLBACK_STATS = {
  totalStudents: 0,
  totalSubjects: 0,
  totalFaculty: 0,
  passPercentage: 0,
  attendancePercentage: 0,
  lowAttendanceStudents: 0,
  lowAttendancePercentage: 0,
  yearWiseResults: [],
  semesterWiseResults: [],
  subjectWiseResults: [],
}

const FALLBACK_ANALYTICS = {
  departmentCounts: [],
  attendanceByDepartment: [],
}

const FALLBACK_REPORTS = {
  subjectAttendance: [],
  semesterAttendance: [],
  yearAttendance: [],
}

const COLORS = {
  students: '#1e40af',
  subjects: '#0891b2',
  faculty: '#7c3aed',
  pass: '#10b981',
  attendance: '#f59e0b',
  low: '#ef4444',
}

const BREAKDOWN_COLORS = {
  Subject: '#1e40af',
  Semester: '#0891b2',
  Department: '#10b981',
  Year: '#f59e0b',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(FALLBACK_STATS)
  const [analytics, setAnalytics] = useState(FALLBACK_ANALYTICS)
  const [reports, setReports] = useState(FALLBACK_REPORTS)
  const [facultyAssignments, setFacultyAssignments] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [allFaculty, setAllFaculty] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dashboardAPI.getStats(),
      studentAPI.analytics(),
      reportAPI.subjectWiseAttendance({}),
      reportAPI.semesterWiseAttendance(),
      reportAPI.yearWiseAttendance(),
      studentAPI.getAll(),
      erpAPI.assignments(),
      erpAPI.faculty(),
    ])
      .then(([statsRes, analyticsRes, subjectRes, semesterRes, yearRes, studentsRes, assignmentsRes, facultyRes]) => {
        setStats({ ...FALLBACK_STATS, ...(statsRes.data.data || {}) })
        setAnalytics({ ...FALLBACK_ANALYTICS, ...(analyticsRes.data.data || {}) })
        setReports({
          subjectAttendance: subjectRes.data.data || FALLBACK_REPORTS.subjectAttendance,
          semesterAttendance: semesterRes.data.data || FALLBACK_REPORTS.semesterAttendance,
          yearAttendance: yearRes.data.data || FALLBACK_REPORTS.yearAttendance,
        })
        setAllStudents(studentsRes.data.data || [])
        setFacultyAssignments(assignmentsRes.data.data || [])
        setAllFaculty(facultyRes.data.data || [])
      })
      .catch(() => {
        setStats(FALLBACK_STATS)
        setAnalytics(FALLBACK_ANALYTICS)
        setReports(FALLBACK_REPORTS)
      })
      .finally(() => setLoading(false))
  }, [])

  const facultySubjects = useMemo(() => {
    if (user?.role !== 'FACULTY') return []
    const assigned = facultyAssignments
      .filter(assignment => isCurrentFacultyAssignment(assignment, user))
      .map(assignment => assignment.subject?.name || assignment.subjectName || '')
      .filter(Boolean)
    return assigned
  }, [facultyAssignments, user])

  const facultyAssignmentsForUser = useMemo(() => {
    if (user?.role !== 'FACULTY') return []
    return (facultyAssignments || []).filter(assignment => isCurrentFacultyAssignment(assignment, user))
  }, [facultyAssignments, user])

  const facultyStudents = useMemo(() => {
    if (user?.role !== 'FACULTY') return []
    return filterStudentsForFaculty(activeStudentsOnly(allStudents), facultyAssignmentsForUser)
  }, [allStudents, facultyAssignmentsForUser, user])

  const activeStudents = useMemo(() => activeStudentsOnly(allStudents), [allStudents])
  const activeFaculty = useMemo(() => activeFacultyOnly(allFaculty), [allFaculty])

  const displayStats = useMemo(() => {
    if (user?.role !== 'FACULTY') {
      return {
        ...stats,
        totalStudents: allStudents.length ? activeStudents.length : stats.totalStudents,
        totalFaculty: allFaculty.length ? activeFaculty.length : stats.totalFaculty,
      }
    }
    return {
      ...stats,
      totalStudents: facultyStudents.length,
      totalSubjects: facultyAssignmentsForUser.length || facultySubjects.length,
      totalFaculty: 1,
    }
  }, [activeFaculty.length, activeStudents.length, allFaculty.length, allStudents.length, facultyAssignmentsForUser.length, facultyStudents.length, facultySubjects.length, stats, user])

  const facultySubjectRows = useMemo(() => {
    if (user?.role !== 'FACULTY') return null
    return facultyAssignmentsForUser.map(assignment => ({
      subject: assignment.subject?.name || assignment.subjectName || 'Assigned Subject',
      label: assignment.subject?.name || assignment.subjectName || 'Assigned Subject',
      studentCount: facultyStudents.filter(student => studentMatchesAssignment(student, assignment)).length,
    }))
  }, [facultyAssignmentsForUser, facultyStudents, user])

  const subjectWiseResults = useMemo(() => (facultySubjectRows || stats.subjectWiseResults || []).map(row => ({
    ...row,
    label: getSubjectLabel(row),
  })).filter(row => facultySubjects.length === 0 || facultySubjects.includes(row.subject || row.subjectName)), [stats.subjectWiseResults, facultySubjects])

  const scopedSemesterRows = user?.role === 'FACULTY'
    ? groupCountRows(facultyStudents, student => student.semester, 'semester', value => `Sem ${value}`)
    : (stats.semesterWiseResults || [])
  const scopedDepartmentRows = user?.role === 'FACULTY'
    ? groupCountRows(facultyStudents, student => student.courseCode || student.courseName, 'label')
    : groupCountRows(activeStudents, student => student.courseCode || student.courseName, 'label')
  const scopedYearRows = user?.role === 'FACULTY'
    ? groupCountRows(facultyStudents, student => student.academicYear, 'academicYear')
    : groupCountRows(activeStudents, student => student.academicYear, 'academicYear')

  const studentBreakdown = useMemo(
    () => toBreakdownRows(scopedDepartmentRows, 'Course', 'label', 'value'),
    [scopedDepartmentRows]
  )

  const attendanceBreakdown = useMemo(
    () => toBreakdownRows(analytics.attendanceByDepartment || [], 'Course', 'label', 'value'),
    [analytics.attendanceByDepartment]
  )

  const kpis = [
    { label: 'Total Students', value: displayStats.totalStudents, icon: Users, color: COLORS.students },
    { label: 'Total Subjects', value: displayStats.totalSubjects, icon: BookOpen, color: COLORS.subjects },
    ...(user?.role === 'FACULTY' ? [] : [{ label: 'Total Faculty', value: displayStats.totalFaculty, icon: GraduationCap, color: COLORS.faculty }]),
    { label: 'Passing Percentage', value: `${displayStats.passPercentage || 0}%`, icon: TrendingUp, color: COLORS.pass },
    { label: 'Attendance Percentage', value: `${displayStats.attendancePercentage || 0}%`, icon: CalendarCheck, color: COLORS.attendance },
    { label: 'Low Attendance', value: `${displayStats.lowAttendancePercentage || 0}%`, icon: AlertTriangle, color: COLORS.low },
  ]

  return (
    <div>
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">{user?.role === 'FACULTY' ? 'Faculty dashboard' : 'Admin dashboard'}</div>
          <h1>Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'}</h1>
          <p>Student strength and attendance by subject, semester, department, and year.</p>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state compact">Loading dashboard...</div></div>
      ) : (
        <>
          <div className="grid-3 dashboard-grid">
            {kpis.map(card => {
              const Icon = card.icon
              return (
                <div className="stat-card erp-stat" style={{ '--accent-color': card.color, '--accent-bg': `${card.color}18` }} key={card.label}>
                  <div className="stat-icon"><Icon size={22} /></div>
                  <div className="stat-value">{card.value ?? 0}</div>
                  <div className="stat-label">{card.label}</div>
                </div>
              )
            })}
          </div>

          <div className="dashboard-charts">
            <BreakdownChart
              title="Student Count Breakdown"
              subtitle="Number of students by course"
              data={studentBreakdown}
              valueLabel="Students"
            />
            <BreakdownChart
              title="Attendance Breakdown"
              subtitle="Attendance percentage by course"
              data={attendanceBreakdown}
              valueLabel="Attendance %"
              percentage
            />
          </div>
        </>
      )}
    </div>
  )
}

function BreakdownChart({ title, subtitle, data, valueLabel, percentage = false }) {
  return (
    <section className="card">
      <div className="section-title">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <TrendingUp size={20} />
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: -12, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            height={8}
            tick={false}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={percentage ? [0, 100] : undefined}
            tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={value => [percentage ? `${value}%` : value, valueLabel]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.displayName || ''}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
            cursor={{ fill: 'rgba(30, 64, 175, 0.08)' }}
          />
          <Bar dataKey="value" name={valueLabel} radius={[7, 7, 0, 0]}>
            {data.map(item => <Cell key={item.key} fill={BREAKDOWN_COLORS[item.type] || COLORS.students} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}

function toBreakdownRows(rows, type, labelKey, valueKey) {
  return rows.slice(0, 5).map(row => {
    const rawLabel = row[labelKey] ?? row.label ?? row.name ?? type
    const displayName = `${type}: ${rawLabel}`
    return {
      key: `${type}-${rawLabel}`,
      type,
      displayName,
      label: displayName,
      value: Number(row[valueKey] || 0),
    }
  })
}

function aggregateYearAttendance(rows) {
  const grouped = rows.reduce((acc, row) => {
    const year = row.academicYear || 'Year'
    if (!acc[year]) acc[year] = { academicYear: year, presentClasses: 0, totalClasses: 0 }
    acc[year].presentClasses += Number(row.presentClasses || 0)
    acc[year].totalClasses += Number(row.totalClasses || 0)
    return acc
  }, {})

  return Object.values(grouped).map(row => ({
    academicYear: row.academicYear,
    percentage: row.totalClasses ? Math.round((row.presentClasses * 1000) / row.totalClasses) / 10 : 0,
  }))
}

function getSubjectLabel(row) {
  const label = String(row.label || '').trim()
  if (label) return label

  const subject = String(row.subjectName || row.subject || '').trim()
  if (!subject) return 'Subject'

  return subject
}

function groupCountRows(rows, keyFn, keyName, labelFn = value => value) {
  const grouped = (rows || []).reduce((acc, row) => {
    const key = keyFn(row) || 'N/A'
    if (!acc[key]) acc[key] = { [keyName]: key, label: labelFn(key), studentCount: 0, value: 0 }
    acc[key].studentCount += 1
    acc[key].value += 1
    return acc
  }, {})
  return Object.values(grouped)
}

function normalizedBranchCode(value) {
  const code = String(value || '').trim().toUpperCase()
  if (code.startsWith('BTECH-')) return code.replace('BTECH-', '')
  if (code.includes('CSE')) return 'CSE'
  if (code.includes('ECE')) return 'ECE'
  if (code.includes('AIDS')) return 'AIDS'
  if (code.includes('AI')) return 'AI'
  if (code.includes('ME')) return 'ME'
  if (code.includes('MCA')) return 'MCA'
  if (code.includes('MBA')) return 'MBA'
  return code
}

function assignmentBranchCode(assignment) {
  return normalizedBranchCode(
    assignment?.branch?.code ||
    assignment?.branch ||
    assignment?.subject?.branch?.code ||
    assignment?.faculty?.department?.code ||
    assignment?.department
  )
}

function isCurrentFacultyAssignment(assignment, user) {
  const faculty = assignment?.faculty || {}
  const userId = String(user?.id || '').trim()
  const userEmail = String(user?.email || '').trim().toLowerCase()
  const userName = String(user?.fullName || '').trim().toLowerCase()
  const username = String(user?.username || '').trim().toLowerCase()
  return (
    (userId && String(faculty.userId || assignment?.userId || '').trim() === userId) ||
    (userEmail && String(faculty.email || '').trim().toLowerCase() === userEmail) ||
    (userName && String(faculty.fullName || assignment?.facultyName || '').trim().toLowerCase() === userName) ||
    (username && String(faculty.username || '').trim().toLowerCase() === username) ||
    (username && String(faculty.employeeCode || assignment?.employeeCode || '').trim().toLowerCase() === username)
  )
}

function studentMatchesAssignment(student, assignment) {
  const studentCode = normalizedBranchCode(student.courseCode || student.courseName || student.branch || '')
  const assignedCode = assignmentBranchCode(assignment)
  const matchesCourse = Boolean(studentCode && assignedCode && studentCode === assignedCode)
  const matchesSemester = Number(student.semester) === Number(assignment?.semester)
  const studentSection = String(student.section || '').trim().toLowerCase()
  const assignmentSection = String(assignment?.section || '').trim().toLowerCase()
  if (!studentSection) return false
  const matchesSection = !assignmentSection || assignmentSection === studentSection
  const matchesYear = !assignment?.academicYear || String(assignment.academicYear) === String(student.academicYear || assignment.academicYear)
  return matchesCourse && matchesSemester && matchesSection && matchesYear
}

function filterStudentsForFaculty(rows, assignments) {
  if (!assignments.length) return []
  return (rows || []).filter(student => assignments.some(assignment => studentMatchesAssignment(student, assignment)))
}

function activeStudentsOnly(rows) {
  return (rows || []).filter(row => String(row.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
}

function activeFacultyOnly(rows) {
  return (rows || []).filter(row => row.active !== false && String(row.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
}
