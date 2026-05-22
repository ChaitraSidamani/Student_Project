import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BarChart3, ClipboardCheck, FileText, RefreshCw, Download } from 'lucide-react'
import { courseAPI, reportAPI, studentAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function AcademicReportsPage() {
  const { user } = useAuth()
  const isFaculty = user?.role === 'FACULTY'
  const [courses, setCourses] = useState([])
  const [filterOptions, setFilterOptions] = useState({ academicYears: [] })
  const [filters, setFilters] = useState({ branchId: '', semester: '', academicYear: '' })
  const [subjectAttendance, setSubjectAttendance] = useState([])
  const [lowAttendance, setLowAttendance] = useState([])
  const [yearAttendance, setYearAttendance] = useState([])
  const [semesterResults, setSemesterResults] = useState([])
  const [yearResults, setYearResults] = useState([])
  const [resultStudents, setResultStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const selectedCourse = courses.find(course => String(course.id) === String(filters.branchId))
  const semesterOptions = semestersForCourse(selectedCourse)

  useEffect(() => {
    courseAPI.getAll().then(res => setCourses((res.data.data || []).filter(isAllowedCourse))).catch(() => setCourses([]))
    studentAPI.filters().then(res => setFilterOptions(res.data.data || { academicYears: [] })).catch(() => setFilterOptions({ academicYears: [] }))
  }, [])

  const params = () => {
    const next = { ...filters }
    Object.keys(next).forEach(key => {
      if (next[key] === '') delete next[key]
    })
    return next
  }

  const loadReports = async () => {
    setLoading(true)
    const p = params()
    const results = await Promise.allSettled([
      reportAPI.subjectWiseAttendance(p),
      reportAPI.lowAttendance(p),
      reportAPI.yearWiseAttendance(),
      reportAPI.semesterWiseResults(p),
      reportAPI.yearWiseResults(),
      reportAPI.resultStudents(p),
    ])

    setSubjectAttendance(reportData(results[0]))
    setLowAttendance(reportData(results[1]))
    setYearAttendance(reportData(results[2]))
    setSemesterResults(reportData(results[3]))
    setYearResults(reportData(results[4]))
    setResultStudents(reportData(results[5]))
    setLoading(false)
  }

  useEffect(() => { loadReports() }, [user, filters])

  const setFilter = (key, value) => setFilters(prev => ({
    ...prev,
    [key]: value,
    ...(key === 'branchId' ? { semester: '' } : {}),
  }))
  const passFail = resultStudents.reduce((acc, row) => {
    if (Number(row.passPercentage || 0) >= 50) acc.pass += 1
    else acc.fail += 1
    return acc
  }, { pass: 0, fail: 0 })

  const downloadReport = () => {
    const data = {
      timestamp: new Date().toISOString(),
      filters: params(),
      data: {
        subjectAttendance,
        lowAttendance,
        semesterResults,
        resultStudents,
      }
    }
    const csv = convertToCSV(data)
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv))
    element.setAttribute('download', `report_${new Date().getTime()}.csv`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Report downloaded!')
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Attendance & Result ERP Reports</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {isFaculty ? 'Your assigned subject analytics and student performance' : 'Subject-wise, semester-wise, and year-wise analytics for admin and faculty'}
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={loadReports} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Apply Filters
          </button>
          <button className="btn btn-ghost" onClick={downloadReport}>
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 20 }}>
        <div className="erp-filter-grid">
          <select className="form-input" value={filters.branchId} onChange={event => setFilter('branchId', event.target.value)}>
            <option value="">All Courses</option>
            {courses.map(course => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
          </select>
          <select className="form-input" value={filters.semester} onChange={event => setFilter('semester', event.target.value)}>
            <option value="">All Semesters</option>
            {semesterOptions.map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
          </select>
          <select className="form-input" value={filters.academicYear} onChange={event => setFilter('academicYear', event.target.value)}>
            <option value="">All Academic Years</option>
            {(filterOptions.academicYears || []).map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
      </section>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Metric label="Subjects Tracked" value={subjectAttendance.length} tone="#1e40af" />
        <Metric label="Low Attendance" value={lowAttendance.length} tone="#ef4444" />
        <Metric label="Pass" value={passFail.pass} tone="#10b981" />
        <Metric label="Fail" value={passFail.fail} tone="#ef4444" />
      </div>

      <div className="dashboard-charts">
        <ReportChart title="Subject-wise Attendance" subtitle="Total attendance percentage by subject" data={subjectAttendance} dataKey="percentage" nameKey="subject" color="#0891b2" icon={<ClipboardCheck size={20} />} />
        <ReportChart title="Semester-wise Pass Percentage" subtitle="Result percentage by semester and subject" data={semesterResults} dataKey="passPercentage" nameKey="subject" color="#10b981" icon={<BarChart3 size={20} />} />
      </div>

      <div className="erp-split">
        <ReportTable
          title="Low Attendance Students"
          subtitle="Subject-wise and year-wise warning list"
          icon={<AlertTriangle size={20} />}
          columns={['Student', 'USN', 'Branch', 'Sem', 'Section', 'Subject', 'Present / Total', 'Percentage']}
          rows={lowAttendance.map(row => [
            row.studentName,
            row.rollNumber,
            row.branch,
            row.semester,
            row.section,
            row.subject,
            `${row.presentClasses} / ${row.totalClasses}`,
            `${row.percentage}%`,
          ])}
        />
        <ReportTable
          title="Year-wise Attendance"
          subtitle="Academic year and subject breakdown"
          icon={<ClipboardCheck size={20} />}
          columns={['Academic Year', 'Subject', 'Present / Total', 'Percentage']}
          rows={yearAttendance.map(row => [
            row.academicYear,
            row.subject,
            `${row.presentClasses} / ${row.totalClasses}`,
            `${row.percentage}%`,
          ])}
        />
      </div>

      <ReportTable
        title="Year-wise Result Analytics"
        subtitle="Academic year, semester, average percentage, and pass percentage"
        icon={<FileText size={20} />}
        columns={['Academic Year', 'Semester', 'Result Records', 'Average %', 'Pass %']}
        rows={yearResults.map(row => [
          row.academicYear,
          row.semester,
          row.resultCount,
          `${row.averagePercentage}%`,
          `${row.passPercentage}%`,
        ])}
      />

      <ReportTable
        title="Students by Year, Semester, and Subject Results"
        subtitle="Admin and faculty can filter by course, semester, and academic year to see student result rows"
        icon={<FileText size={20} />}
        columns={['Student', 'USN', 'Year', 'Sem', 'Branch', 'Subject', 'Results', 'Average %', 'Pass %']}
        rows={resultStudents.map(row => [
          row.studentName,
          row.rollNumber,
          row.academicYear,
          row.semester,
          row.branch,
          row.subject,
          row.resultCount,
          `${row.averagePercentage}%`,
          `${row.passPercentage}%`,
        ])}
      />
    </div>
  )
}

function reportData(result) {
  if (result.status !== 'fulfilled') return []
  return result.value?.data?.data || []
}

function semestersForCourse(course) {
  const total = Number(course?.totalSemesters || 0)
  if (!Number.isFinite(total) || total <= 0) return []
  return Array.from({ length: total }, (_, index) => index + 1)
}

function Metric({ label, value, tone }) {
  return (
    <div className="stat-card" style={{ '--accent-color': tone, '--accent-bg': `${tone}18` }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function ReportChart({ title, subtitle, data, dataKey, nameKey, color, icon }) {
  return (
    <section className="card">
      <div className="section-title">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {icon}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}

function ReportTable({ title, subtitle, icon, columns, rows }) {
  return (
    <section className="card" style={{ padding: 0, marginBottom: 20 }}>
      <div className="table-card-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {icon}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map(column => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length}>No records available</td></tr>
            ) : rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell || '-'}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function isAllowedCourse(course) {
  const code = String(course.code || '').toUpperCase()
  return code.startsWith('BTECH-') || code === 'MCA' || code === 'MBA'
}

function courseBranchCode(course) {
  const code = String(course?.code || '').toUpperCase()
  if (code.includes('CSE')) return 'CSE'
  if (code.includes('ECE')) return 'ECE'
  if (code.includes('AIDS')) return 'AIDS'
  if (code.includes('AI')) return 'AI'
  if (code.includes('ME')) return 'ME'
  if (code.includes('MCA')) return 'MCA'
  if (code.includes('MBA')) return 'MBA'
  return code.replace('BTECH-', '')
}

function subjectMatchesCourse(subject, course) {
  const courseCode = courseBranchCode(course)
  const subjectCode = String(subject.branchCode || '').toUpperCase()
  if (courseCode === subjectCode) return true
  return ['AI', 'AIDS'].includes(courseCode) && ['AI', 'AIDS'].includes(subjectCode)
}

function convertToCSV(data) {
  const headers = ['Report Generated', new Date().toISOString(), '']
  const filterHeaders = Object.keys(data.filters || {}).map(k => `${k}: ${data.filters[k]}`)
  let csv = headers.join(',') + '\n' + filterHeaders.join(',') + '\n\n'
  
  if (data.data.subjectAttendance?.length > 0) {
    csv += 'SUBJECT ATTENDANCE\n'
    csv += 'Subject,Total Classes,Present Classes,Percentage\n'
    data.data.subjectAttendance.forEach(row => {
      csv += `"${row.subject}",${row.totalClasses},${row.presentClasses},${row.percentage}\n`
    })
    csv += '\n'
  }

  if (data.data.lowAttendance?.length > 0) {
    csv += 'LOW ATTENDANCE\n'
    csv += 'Student,USN,Branch,Semester,Subject,Present Classes,Total Classes,Percentage\n'
    data.data.lowAttendance.forEach(row => {
      csv += `"${row.studentName}","${row.rollNumber}","${row.branch}",${row.semester},"${row.subject}",${row.presentClasses},${row.totalClasses},${row.percentage}\n`
    })
    csv += '\n'
  }
  
  if (data.data.resultStudents?.length > 0) {
    csv += 'STUDENT RESULTS\n'
    csv += 'Student,USN,Subject,Average %,Pass %\n'
    data.data.resultStudents.forEach(row => {
      csv += `"${row.studentName}","${row.rollNumber}","${row.subject}",${row.averagePercentage},${row.passPercentage}\n`
    })
  }
  
  return csv
}
