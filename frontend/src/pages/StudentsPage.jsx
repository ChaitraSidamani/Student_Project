import { useEffect, useMemo, useState } from 'react'
import { Camera, CheckCircle2, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Edit2, ListChecks, Plus, Users, X, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI, erpAPI, studentAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZES = [10, 20, 50, 100]
const EMPTY_ANALYTICS = {
  totalStudents: 0,
  activeStudents: 0,
  averageAttendance: 0,
  passPercentage: 0,
  departmentCounts: [],
  attendanceByDepartment: [],
  passPercentageByDepartment: [],
  lowAttendanceAlerts: [],
}

const EMPTY_STUDENT_FORM = {
  rollNumber: '', firstName: '', lastName: '', email: '', phone: '', address: '',
  dateOfBirth: '', gender: '', courseId: '', semester: '', section: '',
  academicYear: '', status: '', courseAcademicYear: '', photoUrl: '', loginPassword: '',
  subjectRegistrationAllowed: false,
}

const SECTION_CAPACITY = 50 // Students per section (A=1-50, B=51-100, C=101-150, D=151-200)

export default function StudentsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [students, setStudents] = useState([])
  const [pageMeta, setPageMeta] = useState({ page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true })
  const [courses, setCourses] = useState([])
  const [facultyAssignments, setFacultyAssignments] = useState([])
  const [filterOptions, setFilterOptions] = useState({ sections: [], academicYears: [], subjects: [] })
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState(null)
  const [editingStudent, setEditingStudent] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [bulkRegistrationUpdating, setBulkRegistrationUpdating] = useState(false)
  const [registeredList, setRegisteredList] = useState([])
  const [loadingRegisteredList, setLoadingRegisteredList] = useState(false)
  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT_FORM)

  const [filters, setFilters] = useState({
    q: '',
    branchId: '',
    subjectId: '',
    semester: '',
    section: '',
    academicYear: '',
    status: '',
    page: 0,
    size: 20,
    sortBy: 'rollNumber',
    sortDir: 'asc',
  })

  const facultyAssignmentsForUser = useMemo(() => {
    if (isAdmin) return []
    return (facultyAssignments || []).filter(assignment => isCurrentFacultyAssignment(assignment, user))
  }, [facultyAssignments, isAdmin, user])

  const params = useMemo(() => {
    const next = { ...filters }
    Object.keys(next).forEach(key => {
      if (next[key] === '') delete next[key]
    })
    return next
  }, [filters])

  const loadStudents = async (showRefresh = false) => {
    showRefresh ? setRefreshing(true) : setLoading(true)
    try {
      if (!isAdmin) {
        const res = await studentAPI.getAll()
        const rows = res.data.data || []
        const visibleRows = applyStudentFilters(filterStudentsForFaculty(rows, facultyAssignmentsForUser), filters, courses, filterOptions.subjects)
        setStudents(visibleRows)
        setPageMeta({
          page: 0,
          size: visibleRows.length,
          totalElements: visibleRows.length,
          totalPages: visibleRows.length ? 1 : 0,
          first: true,
          last: true,
        })
        return
      }
      const res = await studentAPI.search(params)
      const data = res.data.data
      setStudents(data.content || [])
      setPageMeta({
        page: data.page,
        size: data.size,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        first: data.first,
        last: data.last,
      })
    } catch (err) {
      try {
        const fallback = await studentAPI.getAll()
        const rows = fallback.data.data || []
        const visibleRows = isAdmin ? rows : applyStudentFilters(filterStudentsForFaculty(rows, facultyAssignmentsForUser), filters, courses, filterOptions.subjects)
        setStudents(visibleRows)
        setPageMeta({
          page: 0,
          size: visibleRows.length,
          totalElements: visibleRows.length,
          totalPages: visibleRows.length ? 1 : 0,
          first: true,
          last: true,
        })
      } catch {
        setStudents([])
        setAnalytics(prev => prev || EMPTY_ANALYTICS)
        setFilterOptions(prev => ({
          sections: prev.sections || [],
          academicYears: prev.academicYears || [],
          subjects: prev.subjects || [],
        }))
        setPageMeta({
          page: 0,
          size: 0,
          totalElements: 0,
          totalPages: 0,
          first: true,
          last: true,
        })
        toast.error('Backend students API unavailable. No saved students loaded.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    courseAPI.getAll()
      .then(res => {
        const rows = normalizeCourseRows(res.data.data || [])
        setCourses(rows)
      })
      .catch(() => setCourses([]))
    studentAPI.filters().then(res => setFilterOptions(res.data.data || { sections: [], academicYears: [], subjects: [] })).catch(() => setFilterOptions({ sections: [], academicYears: [], subjects: [] }))
    studentAPI.analytics().then(res => setAnalytics(res.data.data)).catch(() => setAnalytics(EMPTY_ANALYTICS))
    erpAPI.assignments().then(res => setFacultyAssignments(res.data.data || [])).catch(() => setFacultyAssignments([]))
  }, [])

  useEffect(() => {
    const id = setTimeout(() => loadStudents(), 250)
    return () => clearTimeout(id)
  }, [params, facultyAssignmentsForUser])

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? value : 0 }))
  const setCourseFilter = value => setFilters(prev => ({ ...prev, branchId: value, semester: '', subjectId: '', page: 0 }))
  const setSemesterFilter = value => setFilters(prev => ({ ...prev, semester: value, subjectId: '', page: 0 }))

  const sort = key => {
    setFilters(prev => ({
      ...prev,
      sortBy: key,
      sortDir: prev.sortBy === key && prev.sortDir === 'asc' ? 'desc' : 'asc',
      page: 0,
    }))
  }

  const visibleCourses = isAdmin ? courses : courses.filter(course => facultyAssignmentsForUser.some(assignment => studentCourseMatchesAssignment({ courseCode: course.code }, assignment)))
  const selectedCourse = visibleCourses.find(course => String(course.id) === String(filters.branchId))
  const selectedFormCourse = courses.find(course => String(course.id) === String(studentForm.courseId))
  const assignedSemesters = uniqueSortedNumbers(facultyAssignmentsForUser.map(assignment => assignment.semester))
  const assignedAcademicYears = uniqueStrings(facultyAssignmentsForUser.map(assignment => assignment.academicYear))
  const facultyDepartmentName = facultyDepartmentLabel(facultyAssignmentsForUser)
  const academicYearFilterOptions = isAdmin ? (filterOptions.academicYears || []) : assignedAcademicYears
  const availableSemesters = isAdmin ? semesterOptions(selectedCourse) : (assignedSemesters.length ? assignedSemesters : [])
  const formSemesters = semesterOptions(selectedFormCourse)
  const facultySubjectOptions = uniqueSubjectsFromAssignments(facultyAssignmentsForUser)
  const baseSubjectOptions = isAdmin ? (filterOptions.subjects || []) : facultySubjectOptions
  const filteredSubjectOptions = baseSubjectOptions.filter(subject => {
    const matchesCourse = !selectedCourse || subjectMatchesCourse(subject, selectedCourse)
    const matchesSemester = !filters.semester || Number(subjectSemesterNumber(subject)) === Number(filters.semester)
    const matchesFaculty = isAdmin || facultyAssignmentsForUser.some(assignment => subjectMatchesAssignment(subject, assignment))
    return matchesCourse && matchesSemester && matchesFaculty
  })
  const subjectOptions = filteredSubjectOptions

  useEffect(() => {
    if (isAdmin || !filters.branchId) return
    if (!visibleCourses.some(course => String(course.id) === String(filters.branchId))) {
      setFilters(prev => ({ ...prev, branchId: '', semester: '', subjectId: '', page: 0 }))
    }
  }, [filters.branchId, isAdmin, visibleCourses])

  const openAddStudent = () => {
    setEditingStudent(null)
    setStudentForm(EMPTY_STUDENT_FORM)
    setModal('student')
  }

  const generateAutoSection = (courseId, semester, academicYear) => {
    if (!courseId || !semester || !academicYear) return 'A'
    const enrolledInGroup = students.filter(s => 
      s.courseId === Number(courseId) && s.semester === Number(semester) && s.academicYear === academicYear
    ).length
    const sectionIndex = Math.floor(enrolledInGroup / SECTION_CAPACITY)
    const sections = ['A', 'B', 'C', 'D']
    return sections[Math.min(sectionIndex, sections.length - 1)]
  }

  const openEditStudent = (student) => {
    setEditingStudent(student)
    setStudentForm({
      rollNumber: student.rollNumber || '',
      firstName: student.firstName || firstNameFromFullName(student.fullName),
      lastName: student.lastName || lastNameFromFullName(student.fullName),
      email: student.email || '',
      phone: student.phone || '',
      address: student.address || '',
      dateOfBirth: student.dateOfBirth || '',
      gender: student.gender || '',
      courseId: student.courseId || '',
      semester: student.semester || '',
      section: student.section || '',
      academicYear: student.academicYear || '',
      status: student.status || '',
      courseAcademicYear: student.academicYear || '',
      photoUrl: student.photoUrl || '',
      loginPassword: '',
      subjectRegistrationAllowed: Boolean(student.subjectRegistrationAllowed),
    })
    setModal('student')
  }

  const openStudentDetails = (student) => {
    setSelectedStudent(student)
    setModal('studentDetails')
  }

  const closeModal = () => {
    setModal(null)
    setEditingStudent(null)
    setSelectedStudent(null)
  }

  const saveStudent = async () => {
    const academicYear = normalizeAcademicYear(studentForm.academicYear)
    const rollNumber = studentForm.rollNumber || generateRollNumber(studentForm.courseId, studentForm.academicYear, courses, students)
    if (!studentForm.firstName || !studentForm.lastName || !studentForm.email || !studentForm.courseId || !studentForm.academicYear || !studentForm.semester) {
      return toast.error('Fill student admission required fields')
    }
    if (!isValidAcademicYear(academicYear)) return toast.error('Academic year must be in YYYY-YY format, for example 2025-26')
    if (!studentForm.gender || !studentForm.status) return toast.error('Select gender and status')
    if (!editingStudent && !studentForm.loginPassword.trim()) return toast.error('Enter the default student login password')
    if (studentForm.phone && !/^\d{10}$/.test(studentForm.phone)) {
      return toast.error('Mobile number must be exactly 10 digits')
    }
    setSaving(true)
    try {
      const payload = {
        ...studentForm,
        rollNumber,
        courseId: Number(studentForm.courseId),
        semester: Number(studentForm.semester),
        section: studentForm.section,
        academicYear,
        dateOfBirth: studentForm.dateOfBirth || null,
      }
      if (editingStudent) {
        await studentAPI.update(editingStudent.id, payload)
        toast.success('Student updated')
      } else {
        await studentAPI.create(payload)
        toast.success(`Student added. Login username: ${rollNumber}`)
      }
      setModal(null)
      setEditingStudent(null)
      setStudentForm(EMPTY_STUDENT_FORM)
      await loadStudents(true)
      studentAPI.analytics().then(res => setAnalytics(res.data.data)).catch(() => {})
    } catch (err) {
      toast.error(cleanError(err, 'Could not add student'))
    } finally {
      setSaving(false)
    }
  }

  const fetchSelectedBatchStudents = async () => {
    const res = await studentAPI.search({
      branchId: filters.branchId,
      semester: filters.semester,
      academicYear: filters.academicYear,
      page: 0,
      size: Math.max(pageMeta.totalElements || 0, 1000),
      sortBy: 'rollNumber',
      sortDir: 'asc',
    })
    return res.data.data?.content || []
  }

  const setSubjectRegistrationGlobal = async (allowed) => {
    if (!isAdmin) return
    if (!window.confirm(`${allowed ? 'Open' : 'Close'} subject registration for ALL students system-wide?`)) return
    setBulkRegistrationUpdating(true)
    try {
      if (allowed) {
        await studentAPI.openRegistration()
      } else {
        await studentAPI.closeRegistration()
      }
      toast.success(`Subject registration ${allowed ? 'opened' : 'closed'} for all students`)
      await loadStudents(true)
    } catch (err) {
      toast.error(cleanError(err, `Could not ${allowed ? 'open' : 'close'} subject registration`))
    } finally {
      setBulkRegistrationUpdating(false)
    }
  }

  const showRegisteredStudentsForBatch = async () => {
    if (!filters.branchId || !filters.semester || !filters.academicYear) {
      return toast.error('Select branch, semester, and academic year first')
    }
    setLoadingRegisteredList(true)
    try {
      const rows = await fetchSelectedBatchStudents()
      setRegisteredList(rows.filter(student => parseRegisteredSubjects(student.registeredSubjects).length > 0))
      setModal('registeredStudents')
    } catch (err) {
      toast.error(cleanError(err, 'Could not load registered students'))
    } finally {
      setLoadingRegisteredList(false)
    }
  }

  const deleteStudent = async (student) => {
    if (!confirm(`Delete ${student.fullName || student.rollNumber}?`)) return
    try {
      await studentAPI.delete(student.id)
      toast.success('Student deleted')
      await loadStudents(true)
      studentAPI.analytics().then(res => setAnalytics(res.data.data)).catch(() => {})
    } catch (err) {
      toast.error(cleanError(err, 'Could not delete student'))
    }
  }

  const exportStudents = async () => {
    let rows = students
    try {
      if (isAdmin && pageMeta.totalElements > students.length) {
        const exportParams = {
          ...params,
          page: 0,
          size: Math.max(pageMeta.totalElements, students.length),
        }
        const res = await studentAPI.search(exportParams)
        rows = res.data.data?.content || students
      }
    } catch {
      rows = students
      toast.error('Could not fetch all matching students. Exporting visible rows.')
    }

    if (!rows.length) {
      toast.error('No student data available to export')
      return
    }

    const headers = [
      'Student Name',
      'USN / Register No.',
      'Email',
      'Phone',
      'Course',
      'Semester',
      'Section',
      'Academic Year',
    ]
    const csvRows = rows.map(student => [
      student.fullName || [student.firstName, student.lastName].filter(Boolean).join(' '),
      student.rollNumber,
      student.email,
      student.phone,
      student.courseCode || student.courseName,
      student.semester,
      student.section,
      student.academicYear,
    ].map(csvCell).join(','))

    const csv = [headers.map(csvCell).join(','), ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} students`)
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Student ERP Management</h1>
        </div>
        <div className="actions">
          {isAdmin && (
            <button className="btn btn-primary" onClick={openAddStudent}>
              <Plus size={16} /> Add Student
            </button>
          )}
          <button className="btn btn-primary" onClick={exportStudents} disabled={loading || refreshing}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 20 }}>
        <div className="erp-filter-grid">
          {isAdmin ? (
            <select className="form-input" value={filters.branchId} onChange={event => setCourseFilter(event.target.value)}>
              <option value="">All Branches</option>
              {visibleCourses.map(course => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
            </select>
          ) : (
            <input className="form-input" value={facultyDepartmentName} readOnly aria-label="Faculty Department" />
          )}
          <input
            className="form-input"
            value={filters.academicYear}
            onChange={event => setFilter('academicYear', normalizeAcademicYearInput(event.target.value))}
            placeholder="Academic Year, e.g. 2025-26"
            aria-label="Academic Year"
            list="student-academic-years"
          />
          <datalist id="student-academic-years">
            {academicYearFilterOptions.map(year => <option key={year} value={year} />)}
          </datalist>
          <select className="form-input" value={filters.semester} onChange={event => setSemesterFilter(event.target.value)}>
            <option value="">All Semesters</option>
            {availableSemesters.map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
          </select>
          <select className="form-input" value={filters.subjectId} onChange={event => setFilter('subjectId', event.target.value)}>
            <option value="">All Subjects</option>
            {subjectOptions.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.code} - {subject.name} {subjectSemesterNumber(subject) ? `(Sem ${subjectSemesterNumber(subject)})` : ''}
              </option>
            ))}
          </select>
          {isAdmin && (
            <>
              <button
                className="btn btn-primary"
                onClick={() => setSubjectRegistrationGlobal(true)}
                disabled={bulkRegistrationUpdating}
                title="Open subject registration for ALL students system-wide"
                style={{ justifyContent: 'center' }}
              >
                <CheckCircle2 size={16} /> {bulkRegistrationUpdating ? 'Updating...' : 'Open Registration (All)'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setSubjectRegistrationGlobal(false)}
                disabled={bulkRegistrationUpdating}
                title="Close subject registration for ALL students system-wide"
                style={{ justifyContent: 'center' }}
              >
                <XCircle size={16} /> Close Registration (All)
              </button>
              <button
                className="btn btn-ghost"
                onClick={showRegisteredStudentsForBatch}
                disabled={loadingRegisteredList || !filters.branchId || !filters.semester || !filters.academicYear}
                title="Show students who have registered subjects in the selected batch"
                style={{ justifyContent: 'center' }}
              >
                <ListChecks size={16} /> {loadingRegisteredList ? 'Loading...' : 'Registered List'}
              </button>
            </>
          )}
        </div>
      </section>

      <section className="card" style={{ padding: 0 }}>
        <div className="table-card-header">
          <div>
            <h3>Advanced Student Table</h3>
            <p>{pageMeta.totalElements} matching students, page {pageMeta.page + 1} of {Math.max(pageMeta.totalPages, 1)}</p>
          </div>
          <select className="form-input" value={filters.size} onChange={event => setFilter('size', Number(event.target.value))} style={{ width: 120 }}>
            {PAGE_SIZES.map(size => <option key={size} value={size}>{size} / page</option>)}
          </select>
        </div>

        {loading ? (
          <div className="empty-state compact"><Spinner /> Loading students...</div>
        ) : students.length === 0 ? (
          <div className="empty-state compact"><Users /> No students found</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortableTh label="Student" sortKey="firstName" current={filters.sortBy} dir={filters.sortDir} onSort={sort} />
                  <SortableTh label="USN / Register No." sortKey="rollNumber" current={filters.sortBy} dir={filters.sortDir} onSort={sort} />
                  <SortableTh label="Branch" sortKey="courseCode" current={filters.sortBy} dir={filters.sortDir} onSort={sort} />
                  <SortableTh label="Semester" sortKey="semester" current={filters.sortBy} dir={filters.sortDir} onSort={sort} />
                  <SortableTh label="Academic Year" sortKey="academicYear" current={filters.sortBy} dir={filters.sortDir} onSort={sort} />
                  <SortableTh label="Admission Date" sortKey="createdAt" current={filters.sortBy} dir={filters.sortDir} onSort={sort} />
                  <SortableTh label="Status" sortKey="status" current={filters.sortBy} dir={filters.sortDir} onSort={sort} />
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id}>
                    <td>
                      <div className="student-cell">
                        <Avatar student={student} />
                        <div>
                          <button
                            type="button"
                            onClick={() => openStudentDetails(student)}
                            title="View student details"
                            style={{ border: 0, background: 'none', padding: 0, color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
                          >
                            {student.fullName}
                          </button>
                          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{student.rollNumber}</td>
                    <td>{student.courseCode || student.courseName || '-'}</td>
                    <td>Sem {student.semester}</td>
                    <td>{student.academicYear || '-'}</td>
                    <td>{formatDate(student.createdAt)}</td>
                    <td><StatusBadge status={student.status} /></td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditStudent(student)} title="Edit student">
                            <Edit2 size={14} /> Edit
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="erp-pagination">
          <button className="btn btn-ghost btn-sm" disabled={pageMeta.first} onClick={() => setFilter('page', Math.max(0, pageMeta.page - 1))}>
            <ChevronLeft size={15} /> Previous
          </button>
          <span>Showing {students.length} of {pageMeta.totalElements}</span>
          <button className="btn btn-ghost btn-sm" disabled={pageMeta.last} onClick={() => setFilter('page', pageMeta.page + 1)}>
            Next <ChevronRight size={15} />
          </button>
        </div>
      </section>

      {modal === 'student' && (
        <AdminModal title={editingStudent ? 'Update Student' : 'New Student Admission'} onClose={closeModal}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Student Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar student={{ ...studentForm, fullName: `${studentForm.firstName} ${studentForm.lastName}` }} />
                <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                  <Camera size={16} /> Upload Photo
                  <input type="file" accept="image/*" onChange={event => readPhoto(event, value => setStudentForm(p => ({ ...p, photoUrl: value })))} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
            <div />
            <ReadOnlyInput label="Roll / USN (Auto-Generated)" value={studentForm.rollNumber || generateRollNumber(studentForm.courseId, studentForm.academicYear, courses, students)} />
            <Input label="Email *" value={studentForm.email} onChange={value => setStudentForm(p => ({ ...p, email: value }))} />
            <Input label="First Name *" value={studentForm.firstName} onChange={value => setStudentForm(p => ({ ...p, firstName: value }))} />
            <Input label="Last Name *" value={studentForm.lastName} onChange={value => setStudentForm(p => ({ ...p, lastName: value }))} />
            <Input label="Mobile Number" value={studentForm.phone} onChange={value => setStudentForm(p => ({ ...p, phone: onlyDigits(value).slice(0, 10) }))} />
            <Select label="Course *" value={studentForm.courseId} onChange={courseId => {
              const course = courses.find(item => String(item.id) === String(courseId))
              const semesters = semesterOptions(course)
              setStudentForm(p => {
                const semester = semesters.includes(Number(p.semester)) ? p.semester : ''
                const rollNumber = generateRollNumber(courseId, p.academicYear, courses, students)
                return { ...p, courseId, rollNumber, semester, section: '' }
              })
            }} options={courses.map(course => [course.id, `${course.code} - ${course.name}`])} placeholder="Select Course" />
            <Input label="Academic Year *" value={studentForm.academicYear} onChange={year => {
              const nextYear = normalizeAcademicYearInput(year)
              setStudentForm(p => {
                const rollNumber = generateRollNumber(p.courseId, nextYear, courses, students)
                return { ...p, academicYear: nextYear, courseAcademicYear: nextYear, rollNumber }
              })
            }} />
            <Select label="Semester *" value={studentForm.semester} onChange={value => setStudentForm(p => ({ ...p, semester: value }))} options={formSemesters.map(n => [n, `Semester ${n}`])} placeholder="Select Semester" />
            <Select label="Gender *" value={studentForm.gender} onChange={value => setStudentForm(p => ({ ...p, gender: value }))} options={['MALE','FEMALE','OTHER'].map(g => [g, g])} placeholder="Select Gender" />
            <Select label="Status *" value={studentForm.status} onChange={value => setStudentForm(p => ({ ...p, status: value }))} options={['ACTIVE','INACTIVE','GRADUATED','SUSPENDED'].map(s => [s, s])} placeholder="Select Status" />
            <Input label={editingStudent ? 'Reset Login Password' : 'Default Login Password *'} type="password" value={studentForm.loginPassword} onChange={value => setStudentForm(p => ({ ...p, loginPassword: value }))} />
            <div className="form-group">
              <label className="form-label">Subject Registration Access</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 42 }}>
                <input type="checkbox" checked={Boolean(studentForm.subjectRegistrationAllowed)} onChange={event => setStudentForm(p => ({ ...p, subjectRegistrationAllowed: event.target.checked }))} />
                Allow student to register subjects
              </label>
            </div>
            <Input label="Date of Birth" type="date" value={studentForm.dateOfBirth} onChange={value => setStudentForm(p => ({ ...p, dateOfBirth: value }))} />
            <Input label="Address" value={studentForm.address} onChange={value => setStudentForm(p => ({ ...p, address: value }))} />
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn btn-primary" onClick={saveStudent} disabled={saving}>
              {saving ? 'Saving...' : editingStudent ? 'Update Student' : 'Add Student'}
            </button>
          </div>
        </AdminModal>
      )}

      {modal === 'studentDetails' && selectedStudent && (
        <AdminModal title="Student Details" onClose={closeModal} top>
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar student={selectedStudent} />
              <div>
                <h3 style={{ margin: 0 }}>{selectedStudent.fullName || '-'}</h3>
                <p style={{ margin: '3px 0 0', color: 'var(--text-muted)' }}>{selectedStudent.email || '-'}</p>
              </div>
            </div>
            <div className="grid-2">
              <ReadOnlyInput label="USN / Register No." value={selectedStudent.rollNumber || '-'} />
              <ReadOnlyInput label="Mobile Number" value={selectedStudent.phone || '-'} />
              <ReadOnlyInput label="Course" value={selectedStudent.courseCode || selectedStudent.courseName || '-'} />
              <ReadOnlyInput label="Semester" value={selectedStudent.semester ? `Semester ${selectedStudent.semester}` : '-'} />
              <ReadOnlyInput label="Section" value={selectedStudent.section || '-'} />
              <ReadOnlyInput label="Academic Year" value={selectedStudent.academicYear || '-'} />
              <ReadOnlyInput label="Admission Date" value={formatDate(selectedStudent.createdAt)} />
              <ReadOnlyInput label="Status" value={selectedStudent.status || '-'} />
              <ReadOnlyInput label="Gender" value={selectedStudent.gender || '-'} />
              <ReadOnlyInput label="Date of Birth" value={selectedStudent.dateOfBirth || '-'} />
            </div>
            <ReadOnlyInput label="Address" value={selectedStudent.address || '-'} />
            {isAdmin && (
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => openEditStudent(selectedStudent)}>
                  <Edit2 size={14} /> Edit Student
                </button>
              </div>
            )}
          </div>
        </AdminModal>
      )}

      {modal === 'registeredStudents' && (
        <AdminModal title="Registered Students" onClose={closeModal} top>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>USN / Register No.</th>
                  <th>Branch</th>
                  <th>Semester</th>
                  <th>Academic Year</th>
                  <th>Registered Subjects</th>
                </tr>
              </thead>
              <tbody>
                {registeredList.length === 0 ? (
                  <tr><td colSpan="6">No students have registered subjects for the selected batch</td></tr>
                ) : registeredList.map(student => (
                  <tr key={student.id}>
                    <td>{student.fullName || [student.firstName, student.lastName].filter(Boolean).join(' ')}</td>
                    <td className="mono">{student.rollNumber}</td>
                    <td>{student.courseCode || student.courseName || '-'}</td>
                    <td>Semester {student.semester || '-'}</td>
                    <td>{student.academicYear || '-'}</td>
                    <td>{parseRegisteredSubjects(student.registeredSubjects).join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminModal>
      )}

    </div>
  )
}

function AdminModal({ title, children, onClose, top = false }) {
  return (
    <div className="overlay" style={top ? { alignItems: 'flex-start', paddingTop: 28 } : undefined}>
      <div className="modal" style={{ maxWidth: 900 }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', disabled = false }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" type={type} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} />
    </div>
  )
}

function ReadOnlyInput({ label, value }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="form-input" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
        {value || 'Select course and academic year'}
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options, placeholder }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-input" value={value} onChange={event => onChange(event.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </div>
  )
}

function academicYearOptions(years = []) {
  return [...new Set((years || []).filter(Boolean))]
}

function studentUpdatePayload(student) {
  return {
    rollNumber: student.rollNumber || '',
    firstName: student.firstName || firstNameFromFullName(student.fullName),
    lastName: student.lastName || lastNameFromFullName(student.fullName),
    email: student.email || '',
    phone: student.phone || '',
    address: student.address || '',
    dateOfBirth: student.dateOfBirth || null,
    gender: student.gender || 'MALE',
    courseId: Number(student.courseId),
    semester: Number(student.semester),
    section: student.section || '',
    academicYear: student.academicYear || '',
    photoUrl: student.photoUrl || '',
    status: student.status || 'ACTIVE',
  }
}

function parseRegisteredSubjects(value) {
  return String(value || '').split('||').map(item => item.trim()).filter(Boolean)
}

function normalizeAcademicYearInput(value) {
  return String(value || '').replace(/[^0-9-]/g, '').slice(0, 7)
}

function normalizeAcademicYear(value) {
  return normalizeAcademicYearInput(value).trim()
}

function isValidAcademicYear(value) {
  return /^20\d{2}-\d{2}$/.test(String(value || '').trim())
}

function cleanError(err, fallback) {
  const message = err.response?.data?.message || ''
  if (message.toLowerCase().includes('constraint') || message.toLowerCase().includes('could not execute statement')) {
    return 'This record already exists or conflicts with existing ERP data.'
  }
  return message || fallback
}

function MetricCard({ label, value, tone }) {
  return (
    <div className="stat-card" style={{ '--accent-color': tone, '--accent-bg': `${tone}18` }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function SortableTh({ label, sortKey, current, dir, onSort }) {
  const active = current === sortKey
  return (
    <th>
      <button className="table-sort-btn" onClick={() => onSort(sortKey)}>
        {label}
        <ChevronsUpDown size={13} style={{ color: active ? 'var(--primary)' : 'var(--text-muted)', transform: active && dir === 'desc' ? 'rotate(180deg)' : 'none' }} />
      </button>
    </th>
  )
}

function StatusBadge({ status }) {
  const map = { ACTIVE: 'badge-green', INACTIVE: 'badge-gray', GRADUATED: 'badge-blue', SUSPENDED: 'badge-red' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status || 'UNKNOWN'}</span>
}

function Avatar({ student }) {
  const photo = student?.photoUrl
  if (photo) {
    return <img className="avatar-sm" src={photo} alt={student.fullName || 'Student'} style={{ objectFit: 'cover' }} />
  }
  return <span className="avatar-sm">{initials(student?.fullName)}</span>
}

function readPhoto(event, onLoad) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.error('Choose an image file')
    return
  }
  if (file.size > 512 * 1024) {
    toast.error('Photo must be below 512 KB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => onLoad(reader.result)
  reader.readAsDataURL(file)
}

function Spinner() {
  return <div className="spin" style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
}

function initials(name) {
  return name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'ST'
}

function firstNameFromFullName(name = '') {
  return name.trim().split(' ')[0] || ''
}

function lastNameFromFullName(name = '') {
  const parts = name.trim().split(' ').filter(Boolean)
  return parts.slice(1).join(' ') || parts[0] || ''
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function normalizeCourseRows(rows) {
  const seen = new Set()
  return (rows || [])
    .filter(course => String(course.code || '').trim())
    .filter(course => String(course.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
    .filter(course => {
      const code = String(course.code || '').trim().toUpperCase()
      if (seen.has(code)) return false
      seen.add(code)
      return true
    })
}

function semesterOptions(course) {
  const total = Number(course?.totalSemesters || 0)
  if (!Number.isFinite(total) || total <= 0) return []
  return Array.from({ length: total }, (_, index) => index + 1)
}

function courseBranchCode(course) {
  const code = String(course?.code || '').toUpperCase()
  if (code.includes('CSE')) return 'CSE'
  if (code.includes('ECE')) return 'ECE'
  if (code.includes('AI')) return 'AI'
  if (code.includes('AIDS')) return 'AIDS'
  if (code.includes('ME')) return 'ME'
  if (code.includes('MCA')) return 'MCA'
  if (code.includes('MBA')) return 'MBA'
  return code.replace('BTECH-', '')
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

function uniqueSortedNumbers(values) {
  return [...new Set((values || []).map(value => Number(value)).filter(Boolean))].sort((a, b) => a - b)
}

function uniqueStrings(values) {
  return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))]
}

function subjectSemesterNumber(subject) {
  return subject?.semester?.number || subject?.semester || ''
}

function subjectBranchCode(subject) {
  return subject?.branchCode || subject?.branch?.code || ''
}

function assignmentHasSubject(assignment) {
  return Boolean(assignment?.subject?.id || assignment?.subject?.code || assignment?.subjectName || assignment?.subject)
}

function uniqueSubjectsFromAssignments(assignments) {
  const subjects = new Map()
  ;(assignments || []).forEach(assignment => {
    const assignedSubject = assignment?.subject || {}
    const id = assignedSubject.id || assignment?.subjectId || assignment?.id
    const code = assignedSubject.code || assignment?.subjectCode || ''
    const name = assignedSubject.name || assignment?.subjectName || (typeof assignment?.subject === 'string' ? assignment.subject : '')
    if (!id || (!code && !name)) return
    const subject = {
      id,
      code,
      name,
      branchCode: subjectBranchCode(assignedSubject) || assignmentBranchCode(assignment),
      semester: subjectSemesterNumber(assignedSubject) || assignment?.semester || '',
    }
    subjects.set(String(id), subject)
  })
  return [...subjects.values()]
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
  const matchesSemester = Number(student.semester) === Number(assignment?.semester)
  const studentSection = String(student.section || '').trim().toLowerCase()
  const assignmentSection = String(assignment?.section || '').trim().toLowerCase()
  if (!studentSection) return false
  const matchesSection = !assignmentSection || assignmentSection === studentSection
  const matchesYear = !assignment?.academicYear || !student.academicYear || String(assignment.academicYear).trim() === String(student.academicYear).trim()
  return matchesCourse && matchesSemester && matchesSection && matchesYear
}

function filterStudentsForFaculty(rows, assignments) {
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

function facultyDepartmentLabel(assignments) {
  const department = assignments.find(assignment => assignment?.faculty?.department)?.faculty?.department || {}
  const code = String(department.code || '').trim()
  const name = String(department.name || '').trim()
  if (code && name) return `${code} - ${name}`
  return name || code || 'Assigned Department'
}

function subjectMatchesAssignment(subject, assignment) {
  const subjectCode = String(subject?.code || '').trim().toUpperCase()
  const subjectName = String(subject?.name || '').trim().toLowerCase()
  const assignedSubject = assignment?.subject || {}
  const assignedCode = String(assignedSubject.code || '').trim().toUpperCase()
  const assignedName = String(assignedSubject.name || assignment?.subjectName || assignment?.subject || '').trim().toLowerCase()
  const matchesSubject = (subjectCode && assignedCode && subjectCode === assignedCode) || (subjectName && assignedName && subjectName === assignedName)
  const matchesBranch = normalizedBranchCode(subjectBranchCode(subject)) === assignmentBranchCode(assignment)
  const matchesSemester = Number(subjectSemesterNumber(subject)) === Number(assignment?.semester)
  return matchesSubject || (matchesBranch && matchesSemester)
}

function applyStudentFilters(rows, filters, courses, subjects = []) {
  const q = filters.q?.toLowerCase()
  const selectedCourse = courses.find(course => String(course.id) === String(filters.branchId))
  const selectedSubject = subjects.find(subject => String(subject.id) === String(filters.subjectId))
  const filtered = (rows || []).filter(student => {
    const matchesSearch = !q || String(student.fullName || '').toLowerCase().includes(q) || String(student.rollNumber || '').toLowerCase().includes(q)
    const matchesBranch = !selectedCourse || normalizedBranchCode(student.courseCode || student.courseName) === normalizedBranchCode(selectedCourse.code)
    const matchesSubject = !selectedSubject || (
      normalizedBranchCode(student.courseCode || student.courseName) === normalizedBranchCode(subjectBranchCode(selectedSubject)) &&
      Number(student.semester) === Number(subjectSemesterNumber(selectedSubject))
    )
    const matchesSemester = !filters.semester || String(student.semester) === String(filters.semester)
    const matchesSection = !filters.section || student.section === filters.section
    const matchesYear = !filters.academicYear || student.academicYear === filters.academicYear
    const matchesStatus = !filters.status || student.status === filters.status
    return matchesSearch && matchesBranch && matchesSubject && matchesSemester && matchesSection && matchesYear && matchesStatus
  })
  return sortStudentRows(filtered, filters.sortBy, filters.sortDir)
}

function sortStudentRows(rows, sortBy = 'rollNumber', sortDir = 'asc') {
  const direction = sortDir === 'desc' ? -1 : 1
  return [...(rows || [])].sort((a, b) => {
    const valueA = studentSortValue(a, sortBy)
    const valueB = studentSortValue(b, sortBy)
    if (typeof valueA === 'number' && typeof valueB === 'number') return (valueA - valueB) * direction
    return String(valueA || '').localeCompare(String(valueB || ''), undefined, { numeric: true, sensitivity: 'base' }) * direction
  })
}

function studentSortValue(student, sortBy) {
  if (sortBy === 'firstName') return student.firstName || firstNameFromFullName(student.fullName)
  if (sortBy === 'courseCode') return student.courseCode || student.courseName
  if (sortBy === 'createdAt') return student.createdAt || ''
  return student[sortBy] ?? ''
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function generateRollNumber(courseId, academicYear, courses, students) {
  if (!courseId || !academicYear) return ''
  const course = courses.find(item => String(item.id) === String(courseId))
  if (!course) return ''
  const prefix = String(course.code || 'BTECH')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  const yearToken = String(academicYear).slice(2, 4)
  const count = students.filter(student =>
    String(student.courseId || '') === String(courseId) &&
    String(student.academicYear || '') === String(academicYear)
  ).length + 1
  return `${prefix}${yearToken}${String(count).padStart(3, '0')}`
}

function subjectMatchesCourse(subject, course) {
  const courseCode = courseBranchCode(course)
  const subjectCode = String(subject.branchCode || '').toUpperCase()
  if (!subjectCode) return false
  if (courseCode === subjectCode) return true
  return ['AI', 'AIDS'].includes(courseCode) && ['AI', 'AIDS'].includes(subjectCode)
}
