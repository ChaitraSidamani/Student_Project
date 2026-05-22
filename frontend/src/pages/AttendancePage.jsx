import { useEffect, useMemo, useState } from 'react'
import { attendanceAPI, studentAPI, courseAPI, erpAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function AttendancePage() {
  const { user } = useAuth()
  // Default tab: admin sees attendance list, faculty marks, student views own summary.
  const [tab, setTab] = useState(user?.role === 'ADMIN' ? 'admin' : user?.role === 'STUDENT' ? 'view' : 'mark')

  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [facultyAssignments, setFacultyAssignments] = useState([])

  // Mark attendance state
  const [selCourse, setSelCourse] = useState('')
  const [selSemester, setSelSemester] = useState('')
  const [selYear, setSelYear] = useState('')
  const [selSubject, setSelSubject] = useState('')
  const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0])
  const [courseStudents, setCourseStudents] = useState([])
  const [attendance, setAttendance] = useState({}) // studentId -> status
  const [marking, setMarking] = useState(false)
  const [savedAttendanceKeys, setSavedAttendanceKeys] = useState(() => new Set())
  const [selectedCourseStudent, setSelectedCourseStudent] = useState(null)
  const [markSearch, setMarkSearch] = useState('')

  // View state
  const [selStudent, setSelStudent] = useState('')
  const [summary, setSummary] = useState(null)
  const [loadingSum, setLoadingSum] = useState(false)
  const [summarySearch, setSummarySearch] = useState('')
  const [summaryBand, setSummaryBand] = useState('low')
  const [summaryRows, setSummaryRows] = useState([])
  const [loadingSummaryRows, setLoadingSummaryRows] = useState(false)
  const [attendanceBand, setAttendanceBand] = useState('low')
  const [adminSearch, setAdminSearch] = useState('')
  const [adminRows, setAdminRows] = useState([])
  const [loadingAdminRows, setLoadingAdminRows] = useState(false)
  const [adminDetail, setAdminDetail] = useState(null)
  const [reportPeriod, setReportPeriod] = useState('semester')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])

  // Fetch all students and courses on mount
  useEffect(() => {
    studentAPI.getAll().then(r => setStudents(r.data.data || []))
    courseAPI.getAll().then(r => setCourses(r.data.data || []))
    erpAPI.subjects().then(r => setSubjects((r.data.data || []).map(normalizeSubjectOption))).catch(() => setSubjects([]))
    erpAPI.assignments().then(r => setFacultyAssignments(r.data.data || [])).catch(() => setFacultyAssignments([]))
  }, [])

  useEffect(() => {
    if (user?.role === 'ADMIN') setTab('admin')
    else if (user?.role === 'STUDENT') setTab('view')
    else if (user?.role === 'FACULTY') setTab('mark')
  }, [user?.role])

  const isFaculty = user?.role === 'FACULTY'
  const facultyAssignmentsForUser = useMemo(() => {
    if (!isFaculty) return []
    return (facultyAssignments || []).filter(assignment => isCurrentFacultyAssignment(assignment, user))
  }, [facultyAssignments, isFaculty, user])
  const facultyCourses = useMemo(() => (
    courses.filter(course => facultyAssignmentsForUser.some(assignment => studentCourseMatchesAssignment({ courseCode: course.code, courseName: course.name }, assignment)))
  ), [courses, facultyAssignmentsForUser])
  const attendanceCourses = isFaculty ? facultyCourses : courses
  const selectedAttendanceCourse = attendanceCourses.find(course => String(course.id) === String(selCourse))
  const facultySemesters = useMemo(() => uniqueSortedNumbers(facultyAssignmentsForUser.map(assignment => assignment.semester)), [facultyAssignmentsForUser])
  const facultyAcademicYears = useMemo(() => uniqueStrings(facultyAssignmentsForUser.map(assignment => assignment.academicYear)), [facultyAssignmentsForUser])
  const facultySubjects = useMemo(() => uniqueSubjectsFromAssignments(facultyAssignmentsForUser), [facultyAssignmentsForUser])
  const facultyDepartmentName = facultyDepartmentLabel(facultyAssignmentsForUser)
  const facultyScopedStudents = useMemo(
    () => isFaculty ? scopeStudentsForFaculty(students, facultyAssignmentsForUser) : students,
    [facultyAssignmentsForUser, isFaculty, students]
  )

  useEffect(() => {
    if (!isFaculty || !selCourse) return
    if (!facultyCourses.some(course => String(course.id) === String(selCourse))) {
      setSelCourse('')
      setSelSemester('')
      setSelYear('')
      setSelSubject('')
    }
  }, [facultyCourses, isFaculty, selCourse])

  // Filter students of selected course for attendance marking
  useEffect(() => {
    if (isFaculty || selCourse) {
      const activeSubject = selSubject || (isFaculty && facultySubjects.length === 1 ? facultySubjects[0].name : '')
      const subjectAssignments = activeSubject
        ? facultyAssignmentsForUser.filter(assignment => assignmentSubjectMatches(assignment, activeSubject))
        : []
      const scopedRows = isFaculty && subjectAssignments.length ? students.filter(student => (
        subjectAssignments.some(assignment => studentMatchesAssignment(student, assignment))
      )) : facultyScopedStudents
      const q = markSearch.trim().toLowerCase()
      const filtered = isFaculty
        ? scopedRows.filter(s => (
          (!selSemester || Number(s.semester) === Number(selSemester)) &&
          (!selYear || String(s.academicYear || '').trim() === String(selYear).trim())
        ))
        : scopedRows.filter(s => (
          (!selCourse || s.courseId === Number(selCourse)) &&
          (!selSemester || Number(s.semester) === Number(selSemester)) &&
          (!selYear || s.academicYear === selYear) &&
          (!q || studentSearchMatches(s, q))
        ))
      setCourseStudents(current => sameStudentList(current, filtered) ? current : filtered)
      setAttendance(current => pruneAttendance(current, filtered))
      setSelectedCourseStudent(current => filtered.some(student => student.id === current?.id) ? current : null)
    } else {
      setCourseStudents(current => current.length ? [] : current)
      setAttendance(current => Object.keys(current).length ? {} : current)
      setSelectedCourseStudent(null)
    }
  }, [selCourse, selSemester, selYear, selSubject, markSearch, facultyScopedStudents, facultyAssignmentsForUser, facultySubjects, isFaculty, students])

  const academicYears = useMemo(() => [...new Set(students.map(s => s.academicYear).filter(Boolean))], [students])
  const attendanceAcademicYears = isFaculty ? facultyAcademicYears : academicYears
  const attendanceSemesters = isFaculty ? facultySemesters : semesterOptions(selectedAttendanceCourse)
  const adminHasActiveSearch = Boolean(adminSearch.trim() || selCourse || selSemester || selYear || reportPeriod !== 'semester')
  const summaryHasActiveSearch = Boolean(summarySearch.trim() || selCourse || selSemester || selYear || selSubject || reportPeriod !== 'semester')
  const attendanceSubjects = useMemo(() => (
    isFaculty
      ? facultySubjects
      : subjects.filter(subject => (
        (!selectedAttendanceCourse || subjectMatchesCourse(subject, selectedAttendanceCourse)) &&
        (!selSemester || Number(subject.semester) === Number(selSemester))
      ))
  ), [facultySubjects, isFaculty, selectedAttendanceCourse, selSemester, subjects])
  const activeAttendanceSubject = selSubject || (isFaculty && attendanceSubjects.length === 1 ? attendanceSubjects[0].name : '')
  const attendanceSaveKey = [
    activeAttendanceSubject,
    selDate,
    selSemester,
    selYear,
    courseStudents.map(student => student.id).join('-'),
  ].join('|')
  const attendanceAlreadySaved = Boolean(activeAttendanceSubject && savedAttendanceKeys.has(attendanceSaveKey))
  const dateRule = attendanceDateRule(user?.role)
  const visibleSummaryStudents = facultyScopedStudents
  const filteredSummaryStudents = visibleSummaryStudents.filter(student => {
    const q = summarySearch.trim().toLowerCase()
    return (
      (!selCourse || student.courseId === Number(selCourse)) &&
      (!selSemester || Number(student.semester) === Number(selSemester)) &&
      (!selYear || student.academicYear === selYear) &&
      (!q || studentSearchMatches(student, q))
    )
  })
  const adminFilteredStudents = students.filter(s => {
    const q = adminSearch.trim().toLowerCase()
    return (
      (!q || String(s.fullName || '').toLowerCase().includes(q) || String(s.rollNumber || '').toLowerCase().includes(q)) &&
      (!selCourse || s.courseId === Number(selCourse)) &&
      (!selSemester || Number(s.semester) === Number(selSemester)) &&
      (!selYear || s.academicYear === selYear)
    )
  })

  // For STUDENT role, set selected student to logged in user automatically
  useEffect(() => {
    if (user?.role === 'STUDENT' && students.length > 0) {
      const loggedStudent = students.find(s =>
        s.username === user.username || s.fullName === user.fullName
      )
      if (loggedStudent) setSelStudent(loggedStudent.id)
    }
  }, [user, students])

  useEffect(() => {
    if (!isFaculty) return
    if (selSemester && !attendanceSemesters.map(String).includes(String(selSemester))) setSelSemester('')
    if (selYear && !attendanceAcademicYears.includes(selYear)) setSelYear('')
    if (selSubject && !attendanceSubjects.some(subject => subject.name === selSubject)) setSelSubject('')
  }, [attendanceAcademicYears, attendanceSemesters, attendanceSubjects, isFaculty, selSemester, selSubject, selYear])

  useEffect(() => {
    if (!isFaculty || selSubject || attendanceSubjects.length !== 1) return
    setSelSubject(attendanceSubjects[0].name)
  }, [attendanceSubjects, isFaculty, selSubject])

  const markAll = (status) => {
    const next = {}
    courseStudents.forEach(s => { next[s.id] = status })
    setAttendance(next)
  }

  const validateMarkingFields = () => {
    if (!selSemester) return toast.error('Select semester')
    if (!selYear) return toast.error('Select academic year')
    if (!activeAttendanceSubject) return toast.error('Select subject')
    if (!selDate) return toast.error('Select attendance date')
    const dateError = validateAttendanceDateForRole(selDate, user?.role)
    if (dateError) return toast.error(dateError)
    if (!isFaculty && !selCourse) return toast.error('Select a course')
    if (courseStudents.length === 0) return toast.error('No students found for selected filters')
    return true
  }

  const handleSubmit = async () => {
    if (validateMarkingFields() !== true) return
    if (attendanceAlreadySaved && !window.confirm('This attendance was already exported/saved. Do you want to export it again?')) return
    const markedStudents = courseStudents.filter(student => attendance[student.id])
    if (markedStudents.length === 0) return toast.error('Mark at least one student')
    setMarking(true)
    try {
      const payload = markedStudents.map(s => ({
        studentId: s.id,
        subject: activeAttendanceSubject,
        attendanceDate: selDate,
        status: attendance[s.id],
      }))
      await attendanceAPI.markBulk(payload)
      setSavedAttendanceKeys(current => new Set([...current, attendanceSaveKey]))
      toast.success(attendanceAlreadySaved ? `Attendance re-exported successfully for ${payload.length} students` : `Attendance saved for ${payload.length} students!`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setMarking(false)
    }
  }

  const saveDraft = async () => {
    if (validateMarkingFields() !== true) return
    const markedStudents = courseStudents.filter(student => attendance[student.id])
    if (markedStudents.length === 0) return toast.error('Mark at least one student')
    setMarking(true)
    try {
      const payload = markedStudents.map(student => ({
        studentId: student.id,
        subject: activeAttendanceSubject,
        attendanceDate: selDate,
        status: attendance[student.id],
        remarks: 'DRAFT',
      }))
      await attendanceAPI.markBulk(payload)
      toast.success(`Draft saved for ${payload.length} student${payload.length === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft')
    } finally {
      setMarking(false)
    }
  }

  const saveIndividualAttendance = async (student) => {
    if (validateMarkingFields() !== true) return
    const status = attendance[student.id]
    if (!status) return toast.error(`Mark Present or Absent for ${student.fullName}`)
    setMarking(true)
    try {
      await attendanceAPI.mark({
        studentId: student.id,
        subject: activeAttendanceSubject,
        attendanceDate: selDate,
        status,
      })
      toast.success(`Attendance saved for ${student.fullName}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance')
    } finally {
      setMarking(false)
    }
  }

  const loadSummary = async () => {
    if (!selStudent) return toast.error('Select a student')
    if (!validateReportFilters()) return
    setLoadingSum(true)
    try {
      const res = await attendanceAPI.getByStudent(selStudent)
      const student = visibleSummaryStudents.find(row => String(row.id) === String(selStudent))
      setSummary(buildAttendanceSummary(res.data.data || [], reportPeriod, reportDate, student))
    } catch {
      toast.error('Failed to load summary')
    } finally {
      setLoadingSum(false)
    }
  }

  const loadStudentSummary = async (student) => {
    if (!validateReportFilters()) return
    setSelStudent(student.id)
    setLoadingSum(true)
    try {
      const res = await attendanceAPI.getByStudent(student.id)
      setSummary(buildAttendanceSummary(res.data.data || [], reportPeriod, reportDate, student))
    } catch {
      toast.error('Failed to load summary')
    } finally {
      setLoadingSum(false)
    }
  }

  const loadSummaryStudents = async () => {
    if (!validateReportFilters()) return
    if (filteredSummaryStudents.length === 0) {
      setSummaryRows([])
      return
    }
    setLoadingSummaryRows(true)
    try {
      const rows = await Promise.all(filteredSummaryStudents.map(async student => {
        try {
          const res = await attendanceAPI.getByStudent(student.id)
          const data = buildAttendanceSummary(res.data.data || [], reportPeriod, reportDate, student)
          return {
            ...student,
            totalClasses: Number(data.totalClasses || 0),
            totalPresent: Number(data.totalPresent || 0),
            attendancePercentage: Number(data.overallPercentage || 0),
          }
        } catch {
          return { ...student, totalClasses: 0, totalPresent: 0, attendancePercentage: 0 }
        }
      }))
      setSummaryRows(rows)
    } finally {
      setLoadingSummaryRows(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'STUDENT' || tab !== 'view') return
    loadSummaryStudents()
  }, [tab, summarySearch, selCourse, selSemester, selYear, summaryBand, reportPeriod, reportDate, visibleSummaryStudents.length])

  useEffect(() => {
    setSummaryRows(rows => rows)
  }, [summaryBand, summaryHasActiveSearch])

  const loadAdminAttendance = async () => {
    if (!validateReportFilters()) return
    if (adminFilteredStudents.length === 0) {
      setAdminRows([])
      return
    }

    setLoadingAdminRows(true)
    try {
      const rows = await Promise.all(adminFilteredStudents.map(async student => {
        try {
          const recordsRes = await attendanceAPI.getByStudent(student.id)
          const records = recordsRes.data.data || []
          const data = buildAttendanceSummary(records, reportPeriod, reportDate, student)
          const facultyNames = Array.from(new Set(records.map(record => record.markedByName).filter(Boolean)))
          return {
            ...student,
            totalClasses: Number(data.totalClasses || 0),
            totalPresent: Number(data.totalPresent || 0),
            attendancePercentage: Number(data.overallPercentage || 0),
            attendanceRecords: records.length,
            markedByFaculty: facultyNames.join(', ') || '-',
          }
        } catch {
          return { ...student, totalClasses: 0, totalPresent: 0, attendancePercentage: 0, attendanceRecords: 0, markedByFaculty: '-' }
        }
      }))
      setAdminRows(rows)
    } finally {
      setLoadingAdminRows(false)
    }
  }

  const openAdminDetail = async (student) => {
    try {
      const res = await attendanceAPI.getByStudent(student.id)
      setAdminDetail({ student, summary: buildAttendanceSummary(res.data.data || [], reportPeriod, reportDate, student) })
    } catch {
      toast.error('Failed to load subject-wise attendance')
    }
  }

  const validateReportFilters = () => {
    if (reportPeriod !== 'semester' && !reportDate) {
      toast.error('Select report date')
      return false
    }
    if (reportDate && !isValidDateValue(reportDate)) {
      toast.error('Select a valid report date')
      return false
    }
    return true
  }

  const downloadAdminAttendance = () => {
    if (adminRows.length === 0) return toast.error('No attendance rows to download')

    const headers = ['Student', 'Roll No.', 'Course', 'Semester', 'Academic Year', 'Present', 'Total Classes', 'Attendance %']
    const rows = adminRows.map(student => [
      student.fullName,
      student.rollNumber,
      student.courseName || '',
      `Semester ${student.semester || ''}`,
      student.academicYear || '',
      student.totalPresent,
      student.totalClasses,
      `${student.attendancePercentage}%`,
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-report-${attendanceBand}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const statusBtn = (studentId, status) => {
    const active = attendance[studentId] === status
    const colors = { PRESENT:'#34d399', ABSENT:'#f87171' }
    return (
      <button
        type="button"
        className="attendance-status-btn"
        onClick={() => setAttendance(p => ({ ...p, [studentId]: status }))}
        style={{
          border: active ? `1px solid ${colors[status]}` : '1px solid var(--border)',
          background: active ? `${colors[status]}20` : 'transparent',
          color: active ? colors[status] : 'var(--text-muted)',
        }}
      >
        {status.charAt(0)}{status.slice(1).toLowerCase()}
      </button>
    )
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Attendance</h1>
        </div>
        <div style={{ display:'flex', gap:4, background:'var(--bg-elevated)', borderRadius:10, padding:4 }}>
          {['ADMIN', 'FACULTY'].includes(user?.role) && (
            <button
              onClick={() => setTab('mark')}
              style={{
                padding:'7px 16px',
                borderRadius:7,
                border:'none',
                cursor:'pointer',
                fontSize:13,
                fontWeight:500,
                background: tab === 'mark' ? 'var(--bg-card)' : 'transparent',
                color: tab === 'mark' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: tab === 'mark' ? 'var(--shadow-sm)' : 'none',
                transition:'all 0.15s',
              }}
            >
              Mark Attendance
            </button>
          )}
          {user?.role === 'ADMIN' ? (
            <button
              onClick={() => setTab('admin')}
              style={{
                padding:'7px 16px',
                borderRadius:7,
                border:'none',
                cursor:'pointer',
                fontSize:13,
                fontWeight:500,
                background: tab === 'admin' ? 'var(--bg-card)' : 'transparent',
                color: tab === 'admin' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: tab === 'admin' ? 'var(--shadow-sm)' : 'none',
                transition:'all 0.15s',
              }}
            >
              Attendance Reports
            </button>
          ) : (
            <button
              onClick={() => setTab('view')}
              style={{
                padding:'7px 16px',
                borderRadius:7,
                border:'none',
                cursor:'pointer',
                fontSize:13,
                fontWeight:500,
                background: tab === 'view' ? 'var(--bg-card)' : 'transparent',
                color: tab === 'view' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: tab === 'view' ? 'var(--shadow-sm)' : 'none',
                transition:'all 0.15s',
              }}
            >
              View Summary
            </button>
          )}
        </div>
      </div>

      {user?.role === 'ADMIN' && tab === 'admin' && (
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:16, alignItems:'end' }}>
              <div className="form-group">
                <label className="form-label">Student Search</label>
                <input className="form-input" value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder="Name or roll no." />
              </div>
              <div className="form-group">
                <label className="form-label">{isFaculty ? 'Faculty Department' : 'Course'}</label>
                <select className="form-input" value={selCourse} onChange={e => setSelCourse(e.target.value)}>
                  <option value="">All Courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <select className="form-input" value={selYear} onChange={e => setSelYear(e.target.value)}>
                  <option value="">All Years</option>
                  {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <select className="form-input" value={selSemester} onChange={e => setSelSemester(e.target.value)}>
                  <option value="">All Semesters</option>
                  {attendanceSemesters.map(n => <option key={n} value={n}>Sem {n}</option>)}
                </select>
              </div>
              <ReportPeriodFields
                period={reportPeriod}
                date={reportDate}
                onPeriodChange={setReportPeriod}
                onDateChange={setReportDate}
              />
              <div className="form-group">
                <label className="form-label">&nbsp;</label>
                <button className="btn btn-primary" onClick={loadAdminAttendance} disabled={loadingAdminRows} style={{ width: '100%', justifyContent: 'center' }}>
                  {loadingAdminRows ? 'Loading...' : 'View Attendance'}
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding:0 }}>
            <div className="table-card-header">
              <div>
                <h3>Attendance Students</h3>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={downloadAdminAttendance}>
                Download Excel
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No.</th>
                    <th>Course</th>
                    <th>Semester</th>
                    <th>Academic Year</th>
                    <th>Present / Total</th>
                    <th>Attendance %</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRows.length === 0 ? (
                    <tr><td colSpan="8">Choose filters and click View Students</td></tr>
                  ) : adminRows.map(student => (
                    <tr key={student.id}>
                      <td>{student.fullName}</td>
                      <td className="mono">{student.rollNumber}</td>
                      <td>{student.courseName || '-'}</td>
                      <td>Semester {student.semester || '-'}</td>
                      <td>{student.academicYear || '-'}</td>
                      <td>{student.totalPresent} / {student.totalClasses}</td>
                      <td>
                        <span className={`badge ${student.attendancePercentage >= 75 ? 'badge-green' : 'badge-red'}`}>
                          {student.attendancePercentage}%
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => openAdminDetail(student)}>
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {adminDetail && (
            <div className="overlay" onClick={event => event.target === event.currentTarget && setAdminDetail(null)}>
              <div className="modal" style={{ maxWidth: 720 }}>
                <div className="modal-header">
                  <div>
                    <h3 style={{ fontWeight: 700 }}>Subject-wise Attendance</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                      {adminDetail.student.fullName} ({adminDetail.student.rollNumber})
                    </p>
                  </div>
                  <button onClick={() => setAdminDetail(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>x</button>
                </div>
                <div className="modal-body">
                  {Object.keys(adminDetail.summary.subjectWise || {}).length === 0 ? (
                    <div className="empty-state compact">No subject-wise attendance found</div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                      {Object.entries(adminDetail.summary.subjectWise).map(([subject, percentage]) => (
                        <div key={subject}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                            <span style={{ fontSize:14, fontWeight:600 }}>{subject}</span>
                            <span style={{
                              fontWeight:700,
                              color: percentage >= 75 ? '#34d399' : percentage >= 60 ? '#f59e0b' : '#f87171'
                            }}>{Number(percentage).toFixed(1)}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-bar-fill" style={{
                              width:`${Math.min(Number(percentage), 100)}%`,
                              background: percentage >= 75 ? '#34d399' : percentage >= 60 ? '#f59e0b' : '#f87171',
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mark Attendance tab */}
      {tab === 'mark' && ['ADMIN', 'FACULTY'].includes(user?.role) && (
        <div>
          {/* Filters */}
          <div className="card" style={{ marginBottom:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:16, alignItems:'end' }}>
              <div className="form-group">
                <label className="form-label">{isFaculty ? 'Faculty Department' : 'Course *'}</label>
                {isFaculty ? (
                  <input className="form-input" value={facultyDepartmentName} readOnly />
                ) : (
                  <select className="form-input" value={selCourse} onChange={e => setSelCourse(e.target.value)}>
                    <option value="">Select Course</option>
                    {attendanceCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Academic Year *</label>
                <select className="form-input" value={selYear} onChange={e => setSelYear(e.target.value)}>
                  <option value="">All Years</option>
                  {attendanceAcademicYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Semester *</label>
                <select className="form-input" value={selSemester} onChange={e => setSelSemester(e.target.value)}>
                  <option value="">All Semesters</option>
                  {attendanceSemesters.map(n => <option key={n} value={n}>Sem {n}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <select className="form-input" value={selSubject} onChange={e => setSelSubject(e.target.value)}>
                  <option value="">Select Subject</option>
                  {attendanceSubjects.map(subject => (
                    <option key={subject.id} value={subject.name}>
                      {subject.code ? `${subject.code} - ` : ''}{subject.name}{subject.semester ? ` (Sem ${subject.semester})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Student Search</label>
                <input className="form-input" value={markSearch} onChange={e => setMarkSearch(e.target.value)} placeholder="Name or roll no." />
              </div>
              <div className="form-group" style={{ alignSelf: 'start' }}>
                <label className="form-label">Date *</label>
                <input
                  className="form-input"
                  type="date"
                  value={selDate}
                  min={dateRule.min}
                  max={dateRule.max}
                  onChange={e => setSelDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">&nbsp;</label>
                <div className="attendance-bulk-actions">
                  <button className="btn btn-ghost attendance-bulk-btn" type="button" onClick={() => markAll('PRESENT')}>All Present</button>
                  <button className="btn btn-ghost attendance-bulk-btn" type="button" onClick={() => markAll('ABSENT')}>All Absent</button>
                </div>
              </div>
            </div>
          </div>

          {/* Student list */}
          {courseStudents.length > 0 ? (
            <div className="card" style={{ padding:0, marginBottom:20 }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontWeight:600 }}>{courseStudents.length} students • {activeAttendanceSubject || 'No subject selected'}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{selDate}</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Roll No.</th>
                      <th className="attendance-action-cell">Mark Attendance</th>
                      <th>Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseStudents.map((s, i) => (
                      <tr key={s.id} onClick={() => setSelectedCourseStudent(s)} style={{ cursor:'pointer' }}>
                        <td style={{ color:'var(--text-muted)', width:40 }}>{i + 1}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <Avatar name={s.fullName} />
                            <span style={{ fontWeight:500 }}>{s.fullName}</span>
                          </div>
                        </td>
                        <td><span className="mono" style={{ fontSize:12, color:'var(--accent)' }}>{s.rollNumber}</span></td>
                        <td className="attendance-action-cell">
                          <div className="attendance-status-actions">
                            {['PRESENT','ABSENT'].map(st => (
                              <span key={st} onClick={event => event.stopPropagation()}>
                                {statusBtn(s.id, st)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={marking || !attendance[s.id]}
                            onClick={event => {
                              event.stopPropagation()
                              saveIndividualAttendance(s)
                            }}
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:'16px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
                <button className="btn btn-ghost" onClick={saveDraft} disabled={marking} style={{ marginRight: 10 }}>
                  {marking ? 'Saving...' : `Save Draft (${Object.values(attendance).filter(Boolean).length})`}
                </button>
                <button className={attendanceAlreadySaved ? 'btn btn-ghost' : 'btn btn-primary'} onClick={handleSubmit} disabled={marking} style={attendanceAlreadySaved ? { opacity: 0.62 } : undefined}>
                  {marking ? 'Saving…' : `${attendanceAlreadySaved ? 'Re-save Attendance' : 'Save Attendance'} (${Object.values(attendance).filter(Boolean).length} marked)`}
                </button>
              </div>
            </div>
          ) : selCourse ? (
            <div className="card"><div className="empty-state">No students enrolled in this course</div></div>
          ) : isFaculty ? (
            <div className="card"><div className="empty-state">No associated students found for your faculty assignments</div></div>
          ) : (
            <div className="card"><div className="empty-state" style={{ padding:40 }}>
              <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Select a course to start marking attendance
            </div></div>
          )}
        </div>
      )}

      {/* View Summary tab */}
      {tab === 'view' && user?.role !== 'ADMIN' && (
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:16, alignItems:'end' }}>
              <div className="form-group">
                <label className="form-label">Student Search</label>
                <input className="form-input" value={summarySearch} onChange={e => setSummarySearch(e.target.value)} placeholder="Name or roll no." disabled={user?.role === 'STUDENT'} />
              </div>
              <div className="form-group">
                <label className="form-label">{isFaculty ? 'Faculty Department' : 'Course'}</label>
                {isFaculty ? (
                  <input className="form-input" value={facultyDepartmentName} readOnly />
                ) : (
                  <select className="form-input" value={selCourse} onChange={e => setSelCourse(e.target.value)} disabled={user?.role === 'STUDENT'}>
                    <option value="">All Courses</option>
                    {attendanceCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <select className="form-input" value={selYear} onChange={e => setSelYear(e.target.value)} disabled={user?.role === 'STUDENT'}>
                  <option value="">All Years</option>
                  {attendanceAcademicYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <select className="form-input" value={selSemester} onChange={e => setSelSemester(e.target.value)} disabled={user?.role === 'STUDENT'}>
                  <option value="">All Semesters</option>
                  {attendanceSemesters.map(n => <option key={n} value={n}>Sem {n}</option>)}
                </select>
              </div>
              <ReportPeriodFields
                period={reportPeriod}
                date={reportDate}
                onPeriodChange={setReportPeriod}
                onDateChange={setReportDate}
              />
              <div className="form-group">
                <label className="form-label">&nbsp;</label>
                <button className="btn btn-primary" onClick={user?.role === 'STUDENT' ? loadSummary : loadSummaryStudents} disabled={loadingSummaryRows || loadingSum} style={{ width:'100%', justifyContent:'center' }}>
                  {loadingSummaryRows ? 'Loading...' : 'View Summary'}
                </button>
              </div>
            </div>
          </div>
          <div className="card" style={{ display:'none' }}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
              <div className="form-group" style={{ flex:1 }}>
                <label className="form-label">Select Student</label>
                <select
                  className="form-input"
                  value={selStudent}
                  onChange={e => setSelStudent(e.target.value)}
                  disabled={user?.role === 'STUDENT'} // disable dropdown if STUDENT user
                >
                  <option value="">Choose a student…</option>
                  {visibleSummaryStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.username || s.rollNumber})
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" onClick={loadSummary} disabled={loadingSum}>
                {loadingSum ? 'Loading…' : 'View Report'}
              </button>
            </div>
          </div>

          {user?.role !== 'STUDENT' && (
            <div className="card" style={{ padding:0, marginBottom:20 }}>
              <div className="table-card-header">
                <div>
                  <h3>Attendance Students</h3>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll No.</th>
                      <th>Course</th>
                      <th>Semester</th>
                      <th>Academic Year</th>
                      <th>Attendance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.length === 0 ? (
                      <tr><td colSpan="7">Choose filters and click View Summary</td></tr>
                    ) : summaryRows.map(student => (
                      <tr key={student.id}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <Avatar name={student.fullName} />
                            <span style={{ fontWeight:500 }}>{student.fullName}</span>
                          </div>
                        </td>
                        <td className="mono">{student.rollNumber}</td>
                        <td>{student.courseName || '-'}</td>
                        <td>Semester {student.semester || '-'}</td>
                        <td>{student.academicYear || '-'}</td>
                        <td>
                          <span className={`badge ${student.attendancePercentage >= 75 ? 'badge-green' : 'badge-red'}`}>
                            {student.attendancePercentage}%
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => loadStudentSummary(student)} disabled={loadingSum && String(selStudent) === String(student.id)}>
                            {loadingSum && String(selStudent) === String(student.id) ? 'Loading...' : 'View Report'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {summary && (
            <div className="overlay" onClick={event => event.target === event.currentTarget && setSummary(null)}>
              <div className="modal" style={{ maxWidth: 900 }}>
                <div className="modal-header">
                  <div>
                    <h3 style={{ fontWeight: 700 }}>Attendance Report</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                      {summary.student?.fullName || visibleSummaryStudents.find(student => String(student.id) === String(selStudent))?.fullName || 'Selected Student'}
                    </p>
                  </div>
                  <button onClick={() => setSummary(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>x</button>
                </div>
                <div className="modal-body">
              <div className="grid-3" style={{ marginBottom:20 }}>
                <div className="stat-card" style={{ '--accent-color':'#4f8ef7','--accent-bg':'rgba(79,142,247,0.12)' }}>
                  <div className="stat-icon"><CalIcon /></div>
                  <div className="stat-value">{summary.totalClasses}</div>
                  <div className="stat-label">Total Classes</div>
                </div>
                <div className="stat-card" style={{ '--accent-color':'#34d399','--accent-bg':'rgba(52,211,153,0.12)' }}>
                  <div className="stat-icon"><CheckIcon /></div>
                  <div className="stat-value">{summary.totalPresent}</div>
                  <div className="stat-label">Classes Attended</div>
                </div>
                <div className="stat-card" style={{
                  '--accent-color': summary.overallPercentage >= 75 ? '#34d399' : summary.overallPercentage >= 60 ? '#f59e0b' : '#f87171',
                  '--accent-bg': summary.overallPercentage >= 75 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)'
                }}>
                  <div className="stat-icon"><ChartIcon /></div>
                  <div className="stat-value">{summary.overallPercentage}%</div>
                  <div className="stat-label">Overall Attendance</div>
                </div>
              </div>

              {/* Subject-wise attendance */}
              {Object.keys(summary.subjectWise || {}).length > 0 && (
                <div className="card">
                  <h3 style={{ fontWeight:700, marginBottom:16 }}>Subject-wise Attendance</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {Object.entries(summary.subjectWise).map(([subj, pct]) => (
                      <div key={subj}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                          <span style={{ fontSize:14, fontWeight:500 }}>{subj}</span>
                          <span style={{
                            fontWeight:700, fontSize:14,
                            color: pct >= 75 ? '#34d399' : pct >= 60 ? '#f59e0b' : '#f87171'
                          }}>{pct.toFixed(1)}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{
                            width:`${Math.min(pct,100)}%`,
                            background: pct >= 75 ? '#34d399' : pct >= 60 ? '#f59e0b' : '#f87171',
                          }} />
                        </div>
                        {pct < 75 && (
                          <div style={{ fontSize:11, color:'#f87171', marginTop:4 }}>
                            ⚠ Below 75% attendance threshold
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedCourseStudent && (
        <StudentDetailModal student={selectedCourseStudent} onClose={() => setSelectedCourseStudent(null)} />
      )}
    </div>
  )
}

function StudentDetailModal({ student, onClose }) {
  return (
    <div className="overlay" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 760 }}>
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Avatar name={student.fullName} />
            <div>
              <h3 style={{ fontWeight:700 }}>{student.fullName || 'Student Details'}</h3>
              <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:4 }}>
                {student.rollNumber || student.username || '-'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:20 }}>x</button>
        </div>
        <div className="modal-body">
          <div className="grid-2">
            <DetailField label="Course" value={student.courseName || student.courseCode || '-'} />
            <DetailField label="Semester" value={student.semester ? `Semester ${student.semester}` : '-'} />
            <DetailField label="Academic Year" value={student.academicYear || '-'} />
            <DetailField label="Section" value={student.section || '-'} />
            <DetailField label="Email" value={student.email || '-'} />
            <DetailField label="Phone" value={student.phone || '-'} />
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailField({ label, value }) {
  return (
    <div className="profile-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ReportPeriodFields({ period, date, onPeriodChange, onDateChange }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Report Type</label>
        <select className="form-input" value={period} onChange={event => onPeriodChange(event.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="fifteen">15 Days</option>
          <option value="monthly">Monthly</option>
          <option value="semester">Per Semester</option>
        </select>
      </div>
      {period !== 'semester' && (
        <div className="form-group">
          <label className="form-label">Report Date</label>
          <input className="form-input" type="date" value={date} max={todayValue()} onChange={event => onDateChange(event.target.value)} />
        </div>
      )}
    </>
  )
}

function buildAttendanceSummary(records, period, reportDate, student) {
  const filteredRecords = filterRecordsByPeriod(records, period, reportDate)
  const totalBySubject = {}
  const presentBySubject = {}

  filteredRecords.forEach(record => {
    const subject = attendanceSubjectSemesterLabel(record, student)
    totalBySubject[subject] = (totalBySubject[subject] || 0) + 1
    if (record.status === 'PRESENT') presentBySubject[subject] = (presentBySubject[subject] || 0) + 1
  })

  const subjectWise = {}
  const subjectCounts = {}
  Object.entries(totalBySubject).forEach(([subject, total]) => {
    const present = presentBySubject[subject] || 0
    const percentage = total ? Math.round((present * 1000) / total) / 10 : 0
    subjectWise[subject] = percentage
    subjectCounts[subject] = { attendedClasses: present, totalClasses: total, percentage }
  })

  const totalPresent = filteredRecords.filter(record => record.status === 'PRESENT').length
  const overallPercentage = filteredRecords.length ? Math.round((totalPresent * 1000) / filteredRecords.length) / 10 : 0

  return {
    student,
    totalClasses: filteredRecords.length,
    totalPresent,
    overallPercentage,
    subjectWise,
    subjectCounts,
    records: filteredRecords,
  }
}

function attendanceSubjectSemesterLabel(record, student) {
  const subject = record?.subject || 'Subject'
  const semester = record?.semester || student?.semester
  return semester ? `${subject} (Sem ${semester})` : subject
}

function filterRecordsByPeriod(records, period, reportDate) {
  if (period === 'semester') return records || []
  const range = reportDateRange(period, reportDate)
  if (!range) return []
  return (records || []).filter(record => {
    const value = dateOnly(record.attendanceDate)
    return value && value >= range.start && value <= range.end
  })
}

function reportDateRange(period, reportDate) {
  const anchor = parseDateValue(reportDate)
  if (!anchor) return null
  const start = new Date(anchor)
  const end = new Date(anchor)
  if (period === 'weekly') start.setDate(anchor.getDate() - 6)
  if (period === 'fifteen') start.setDate(anchor.getDate() - 14)
  if (period === 'monthly') start.setDate(anchor.getDate() - 29)
  return { start: dateValue(start), end: dateValue(end) }
}

function reportPeriodLabel(period, reportDate) {
  if (period === 'semester') return 'selected semester'
  const labels = { daily: 'daily', weekly: 'weekly', fifteen: '15 days', monthly: 'monthly' }
  const range = reportDateRange(period, reportDate)
  if (!range) return labels[period] || 'selected period'
  return `${labels[period] || 'selected period'} report (${range.start} to ${range.end})`
}

function validateAttendanceDateForRole(value, role) {
  const selected = parseDateValue(value)
  if (!selected) return 'Select a valid attendance date'
  const today = parseDateValue(todayValue())
  if (selected > today) return 'Future attendance is not allowed'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (role === 'ADMIN') {
    if (selected < yesterday) return 'Admin can add previous attendance only up to one day'
    return ''
  }
  if (dateValue(selected) !== dateValue(today)) return 'Faculty can mark attendance only for today'
  return ''
}

function attendanceDateRule(role) {
  const today = todayValue()
  if (role === 'ADMIN') {
    const yesterday = new Date(parseDateValue(today))
    yesterday.setDate(yesterday.getDate() - 1)
    return {
      min: dateValue(yesterday),
      max: today,
      help: 'Admin can mark today or yesterday only.',
    }
  }
  return {
    min: today,
    max: today,
    help: 'Faculty can mark attendance for today only.',
  }
}

function isValidDateValue(value) {
  return Boolean(parseDateValue(value))
}

function todayValue() {
  return dateValue(new Date())
}

function dateOnly(value) {
  return String(value || '').slice(0, 10)
}

function parseDateValue(value) {
  const raw = dateOnly(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const date = new Date(`${raw}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function Avatar({ name }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '??'
  const colors = ['#4f8ef7','#34d399','#f59e0b','#a78bfa','#f87171']
  const color = colors[name?.charCodeAt(0) % colors.length] || '#4f8ef7'
  return (
    <div style={{
      width:30, height:30, borderRadius:'50%',
      background:`${color}28`, color,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:11, fontWeight:700, flexShrink:0
    }}>
      {initials}
    </div>
  )
}

function uniqueSortedNumbers(values) {
  return [...new Set((values || []).map(value => Number(value)).filter(Boolean))].sort((a, b) => a - b)
}

function uniqueStrings(values) {
  return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))]
}

function semesterOptions(course) {
  const total = Number(course?.totalSemesters || 0)
  if (!Number.isFinite(total) || total <= 0) return []
  return Array.from({ length: total }, (_, index) => index + 1)
}

function subjectMatchesCourse(subject, course) {
  const courseCode = normalizedBranchCode(course?.code || course?.name || '')
  const subjectCode = normalizedBranchCode(subject?.branchCode || subject?.branch?.code || subject?.branch?.name || '')
  if (!courseCode || !subjectCode) return false
  if (courseCode === subjectCode) return true
  return ['AI', 'AIDS'].includes(courseCode) && ['AI', 'AIDS'].includes(subjectCode)
}

function normalizedBranchCode(value) {
  const code = String(value || '').trim().toUpperCase()
  if (code.startsWith('BTECH-')) return code.replace('BTECH-', '')
  if (/^CS\d*$/.test(code)) return 'CSE'
  if (/^EC\d*$/.test(code)) return 'ECE'
  if (/^MC\d*$/.test(code)) return 'MCA'
  if (/^MB\d*$/.test(code)) return 'MBA'
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

function assignmentBranchName(assignment) {
  return normalizedName(
    assignment?.branch?.name ||
    assignment?.subject?.branch?.name ||
    assignment?.faculty?.department?.name ||
    assignment?.departmentName ||
    ''
  )
}

function normalizedName(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
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

function studentCourseMatchesAssignment(student, assignment) {
  const studentCode = normalizedBranchCode(student.courseCode || student.courseName || student.branch || '')
  const assignedCode = assignmentBranchCode(assignment)
  const studentName = normalizedName(student.courseName || student.branch || '')
  const assignedName = assignmentBranchName(assignment)
  const matchesCode = Boolean(studentCode && assignedCode && studentCode === assignedCode)
  const matchesName = Boolean(studentName && assignedName && (studentName === assignedName || studentName.includes(assignedName) || assignedName.includes(studentName)))
  return matchesCode || matchesName
}

function studentMatchesAssignment(student, assignment) {
  const matchesCourse = studentCourseMatchesAssignment(student, assignment)
  const matchesSemester = !assignment?.semester || Number(student.semester) === Number(assignment.semester)
  const studentSection = String(student.section || '').trim().toLowerCase()
  const assignmentSection = String(assignment?.section || '').trim().toLowerCase()
  if (!studentSection) return false
  const matchesSection = !assignmentSection || assignmentSection === studentSection
  return matchesCourse && matchesSemester && matchesSection
}

function scopeStudentsForFaculty(rows, assignments) {
  if (!assignments.length) return []
  const scopedRows = (rows || []).filter(student => assignments.some(assignment => studentMatchesAssignment(student, assignment)))
  return scopedRows.length ? scopedRows : filterStudentsByFacultyDepartment(rows, assignments)
}

function filterStudentsByFacultyDepartment(rows, assignments) {
  const scopedAssignments = (assignments || []).filter(assignment => assignmentBranchCode(assignment) || assignmentBranchName(assignment))
  if (!scopedAssignments.length) return []
  return (rows || []).filter(student => scopedAssignments.some(assignment => {
    const assignedCode = assignmentBranchCode(assignment)
    const assignedName = assignmentBranchName(assignment)
    const studentCode = normalizedBranchCode(student.courseCode || student.courseName || student.branch || '')
    const studentName = normalizedName(student.courseName || student.branch || '')
    const matchesDepartment = (
      Boolean(assignedCode && studentCode && assignedCode === studentCode) ||
      Boolean(assignedName && studentName && (studentName === assignedName || studentName.includes(assignedName) || assignedName.includes(studentName)))
    )
    const matchesSemester = !assignment?.semester || Number(student.semester) === Number(assignment.semester)
    const studentSection = String(student.section || '').trim().toLowerCase()
    const assignmentSection = String(assignment?.section || '').trim().toLowerCase()
    const matchesSection = Boolean(studentSection) && (!assignmentSection || assignmentSection === studentSection)
    const matchesYear = !assignment?.academicYear || !student.academicYear || String(assignment.academicYear).trim() === String(student.academicYear).trim()
    return matchesDepartment && matchesSemester && matchesSection && matchesYear
  }))
}

function studentSearchMatches(student, query) {
  const q = String(query || '').trim().toLowerCase()
  return (
    String(student.fullName || '').toLowerCase().includes(q) ||
    String(student.rollNumber || '').toLowerCase().includes(q)
  )
}

function sameStudentList(left, right) {
  if (left.length !== right.length) return false
  return left.every((student, index) => String(student.id) === String(right[index]?.id))
}

function pruneAttendance(attendance, visibleStudents) {
  const visibleIds = new Set(visibleStudents.map(student => String(student.id)))
  const next = {}
  Object.entries(attendance || {}).forEach(([studentId, status]) => {
    if (visibleIds.has(String(studentId))) next[studentId] = status
  })
  return sameObject(attendance || {}, next) ? attendance : next
}

function sameObject(left, right) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return leftKeys.length === rightKeys.length && leftKeys.every(key => left[key] === right[key])
}

function subjectSemesterNumber(subject) {
  return subject?.semester?.number || subject?.semester || ''
}

function normalizeSubjectOption(subject) {
  return {
    id: subject.id || subject.code || subject.name,
    code: subject.code || '',
    name: subject.name || subject.subjectName || '',
    semester: subjectSemesterNumber(subject),
    branchCode: subject.branch?.code || subject.branchCode || '',
  }
}

function uniqueSubjectsFromAssignments(assignments) {
  const subjects = new Map()
  ;(assignments || []).forEach(assignment => {
    const assignedSubject = assignment?.subject || {}
    const id = assignedSubject.id || assignment?.subjectId || assignment?.id
    const code = assignedSubject.code || assignment?.subjectCode || ''
    const name = assignedSubject.name || assignment?.subjectName || (typeof assignment?.subject === 'string' ? assignment.subject : '')
    if (!id || (!code && !name)) return
    subjects.set(String(id), {
      id,
      code,
      name,
      semester: subjectSemesterNumber(assignedSubject) || assignment?.semester || '',
    })
  })
  return [...subjects.values()]
}

function assignmentSubjectMatches(assignment, subjectName) {
  const assignedSubject = assignment?.subject || {}
  const assignedName = assignedSubject.name || assignment?.subjectName || (typeof assignment?.subject === 'string' ? assignment.subject : '')
  return String(assignedName || '').trim().toLowerCase() === String(subjectName || '').trim().toLowerCase()
}

function facultyDepartmentLabel(assignments) {
  const department = assignments.find(assignment => assignment?.faculty?.department)?.faculty?.department || {}
  const code = String(department.code || '').trim()
  const name = String(department.name || '').trim()
  if (code && name) return `${code} - ${name}`
  return name || code || 'Assigned Department'
}

function CalIcon() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}

function CheckIcon() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
}

function ChartIcon() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
