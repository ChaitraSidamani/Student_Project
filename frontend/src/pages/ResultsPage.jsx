import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { courseAPI, erpAPI, resultAPI, studentAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const EMPTY_FILTERS = { courseId: '', semester: '', academicYear: '', subject: '' }

export default function ResultsPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const view = user?.role === 'ADMIN' && location.pathname.includes('/see') ? 'see' : 'internal'
  const adminInternalViewOnly = user?.role === 'ADMIN' && view === 'internal'
  const isAdminSeeView = user?.role === 'ADMIN' && view === 'see'
  const canEditMarks = (user?.role === 'FACULTY' && view === 'internal') || (user?.role === 'ADMIN' && view === 'see')
  const entryExamType = view === 'see' ? 'FINAL' : 'INTERNAL'
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [facultyAssignments, setFacultyAssignments] = useState([])
  const [resultRows, setResultRows] = useState([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [modalStudent, setModalStudent] = useState(null)
  const [savedMarksStudent, setSavedMarksStudent] = useState(null)
  const [marks, setMarks] = useState({})
  const [studentComponentMarks, setStudentComponentMarks] = useState({})
  const [studentResultSubject, setStudentResultSubject] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [componentsBySubject, setComponentsBySubject] = useState({}) // subjectId -> components[]
  const [editingSavedMarks, setEditingSavedMarks] = useState(false)
  const [editingResultId, setEditingResultId] = useState('')
  const [saving, setSaving] = useState(false)
  const [sharingKey, setSharingKey] = useState('')
  const [exportingToAdmin, setExportingToAdmin] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      studentAPI.getAll(),
      courseAPI.getAll(),
      erpAPI.subjects(),
      erpAPI.assignments(),
    ]).then(([studentRes, courseRes, subjectRes, assignmentRes]) => {
      setStudents(dataOrEmpty(studentRes))
      setCourses(dataOrEmpty(courseRes))
      const subjectRows = normalizeSubjects(dataOrEmpty(subjectRes))
      setSubjects(subjectRows)
      setFacultyAssignments(dataOrEmpty(assignmentRes))
      // Load DB-backed components for all subjects
      const rows = dataOrEmpty(subjectRes)
      rows.forEach(subject => {
        erpAPI.getSubjectComponents(subject.id)
          .then(res => {
            const components = (res.data.data || []).map(c => ({
              id: String(c.id),
              name: c.name,
              maxMarks: c.maxMarks,
            }))
            if (components.length) {
              setComponentsBySubject(prev => ({ ...prev, [subject.id]: components }))
            }
          })
          .catch(() => {})
      })
    })
  }, [])

  const isFaculty = user?.role === 'FACULTY'
  const facultyAssignmentsForUser = useMemo(() => {
    if (!isFaculty) return []
    return (facultyAssignments || []).filter(assignment => isCurrentFacultyAssignment(assignment, user))
  }, [facultyAssignments, isFaculty, user])
  const visibleCourses = useMemo(() => (
    isFaculty
      ? courses.filter(course => facultyAssignmentsForUser.some(assignment => studentCourseMatchesAssignment({ courseCode: course.code, courseName: course.name }, assignment)))
      : courses
  ), [courses, facultyAssignmentsForUser, isFaculty])
  const facultyDepartmentName = facultyDepartmentLabel(facultyAssignmentsForUser)
  const selectedCourse = visibleCourses.find(course => String(course.id) === String(filters.courseId))
  const facultySubjects = useMemo(() => uniqueSubjectsFromAssignments(facultyAssignmentsForUser), [facultyAssignmentsForUser])
  const baseSubjects = isFaculty ? facultySubjects : subjects
  const subjectOptions = useMemo(() => baseSubjects.filter(subject => {
    const matchesCourse = !selectedCourse || subjectMatchesCourse(subject, selectedCourse)
    const matchesSemester = !filters.semester || Number(subject.semester) === Number(filters.semester)
    const matchesYear = !isFaculty || !filters.academicYear || facultyAssignmentsForUser.some(assignment => (
      String(assignment.academicYear || '') === String(filters.academicYear) &&
      String(assignment?.subject?.id || assignment?.subjectId || assignment?.id) === String(subject.id)
    ))
    return matchesCourse && matchesSemester && matchesYear
  }), [baseSubjects, facultyAssignmentsForUser, filters.academicYear, filters.semester, isFaculty, selectedCourse])
  const facultyScopedStudents = useMemo(
    () => isFaculty ? scopeStudentsForFaculty(students, facultyAssignmentsForUser) : students,
    [facultyAssignmentsForUser, isFaculty, students]
  )
  const marksEligibleStudents = useMemo(() => (
    facultyScopedStudents.filter(student => isStudentEligibleForMarks(student, entryExamType))
  ), [entryExamType, facultyScopedStudents])
  const filteredStudents = useMemo(() => {
    if (isFaculty) return marksEligibleStudents
    return marksEligibleStudents.filter(student => (
      (!filters.courseId || Number(student.courseId) === Number(filters.courseId)) &&
      (!filters.semester || Number(student.semester) === Number(filters.semester)) &&
      (!filters.academicYear || student.academicYear === filters.academicYear) &&
      (!studentSearch.trim() || studentSearchMatches(student, studentSearch))
    ))
  }, [filters, isFaculty, marksEligibleStudents, studentSearch])

  const academicYears = useMemo(() => (
    isFaculty
      ? uniqueStrings(facultyAssignmentsForUser.map(assignment => assignment.academicYear))
      : Array.from(new Set(students.map(student => student.academicYear).filter(Boolean)))
  ), [facultyAssignmentsForUser, isFaculty, students])
  const semesters = useMemo(() => {
    if (isFaculty) return uniqueSortedNumbers(facultyAssignmentsForUser.map(assignment => assignment.semester))
    return semesterOptions(selectedCourse)
  }, [facultyAssignmentsForUser, isFaculty, selectedCourse])

  useEffect(() => {
    if (!isFaculty || !filters.courseId) return
    if (!visibleCourses.some(course => String(course.id) === String(filters.courseId))) {
      setFilters(prev => ({ ...prev, courseId: '', semester: '', academicYear: '', subject: '' }))
    }
  }, [filters.courseId, isFaculty, visibleCourses])

  useEffect(() => {
    if (!isAdminSeeView) return
    if (filters.subject) {
      setFilters(prev => ({ ...prev, subject: '' }))
    }
    if (studentSearch) {
      setStudentSearch('')
    }
  }, [filters.subject, isAdminSeeView, studentSearch])

  useEffect(() => {
    if (!isFaculty) return
    if (filters.semester && !semesters.map(String).includes(String(filters.semester))) {
      setFilters(prev => ({ ...prev, semester: '', subject: '' }))
      return
    }
    if (filters.academicYear && !academicYears.includes(filters.academicYear)) {
      setFilters(prev => ({ ...prev, academicYear: '', subject: '' }))
      return
    }
    if (filters.subject && !subjectOptions.some(subject => subject.name === filters.subject)) {
      setFilters(prev => ({ ...prev, subject: '' }))
    }
  }, [academicYears, filters.academicYear, filters.semester, filters.subject, isFaculty, semesters, subjectOptions])

  useEffect(() => {
    if (filteredStudents.length === 0) {
      setResultRows([])
      return
    }

    let cancelled = false
    setLoadingResults(true)
    Promise.all(filteredStudents.map(student => (
      resultAPI.getByStudent(student.id)
        .then(response => response.data.data || [])
        .catch(() => [])
    )))
      .then(groups => {
        if (!cancelled) setResultRows(groups.flat())
      })
      .finally(() => {
        if (!cancelled) setLoadingResults(false)
      })

    return () => { cancelled = true }
  }, [filteredStudents])

  // Components are now DB-backed; no localStorage needed

  const setFilter = key => event => {
    const value = event.target.value
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'courseId' ? { semester: '', subject: '' } : {}),
      ...(key === 'semester' ? { subject: '' } : {}),
    }))
  }

  const openAddResults = student => {
    if (!canEditMarks) return toast.error('You can only view marks here')
    const rows = resultRowsForCurrentView(student)
    const defaultSubject = defaultStudentSubjectForEntry(student)
    const existingRow = rows.find(result => subjectMatchesValue(result.subject, defaultSubject)) || rows[0]
    setModalStudent(student)
    setMarks(existingRow ? rows.reduce((acc, result) => ({ ...acc, [result.subject]: result.marksObtained ?? '' }), {}) : {})
    setStudentComponentMarks(componentMarksFromResult(existingRow))
    setStudentResultSubject(existingRow?.subject || defaultSubject)
    setEditingSavedMarks(Boolean(existingRow))
    setEditingResultId(existingRow?.id || '')
    setSavedMarksStudent(null)
  }

  const openUpdateResults = (student, savedRows) => {
    if (!canEditMarks) return toast.error('You can only view marks here')
    const rows = savedRows || resultRowsForCurrentView(student)
    const subject = rows[0]?.subject || defaultStudentSubjectForEntry(student)
    const row = rows.find(result => subjectMatchesValue(result.subject, subject)) || rows[0]
    const savedComponents = parseResultComponents(row)
    if (savedComponents.length) {
      setComponentsBySubject(prev => ({
        ...prev,
        [subject]: prev[subject]?.length ? prev[subject] : savedComponents.map(component => ({
          id: component.id,
          name: component.name,
          maxMarks: Number(component.maxMarks),
        })),
      }))
    }
    setModalStudent(student)
    setStudentResultSubject(subject)
    setMarks(rows.reduce((acc, result) => ({ ...acc, [result.subject]: result.marksObtained ?? '' }), {}))
    setStudentComponentMarks(componentMarksFromResult(row))
    setEditingSavedMarks(true)
    setEditingResultId(row?.id || '')
    setSavedMarksStudent(null)
  }

  const studentSubjects = useMemo(() => {
    if (!modalStudent) return []
    return subjectsForStudent(modalStudent, courses, baseSubjects)
      .filter(subject => entryExamType !== 'INTERNAL' || studentRegisteredForSubject(modalStudent, subject))
      .filter(subject => !filters.subject || subjectMatchesValue(subjectValue(subject), filters.subject))
      .filter(subject => !isFaculty || subjectOptions.some(option => subjectMatchesValue(subjectValue(option), subjectValue(subject))))
  }, [modalStudent, courses, baseSubjects, entryExamType, filters.subject, isFaculty, subjectOptions])
  const selectedSubjectForEntry = studentSubjects.find(subject => subjectMatchesValue(subjectValue(subject), studentResultSubject))
  const selectedSubjectEligible = !modalStudent || view !== 'see' || hasInternalMarksForSubject(modalStudent, selectedSubjectForEntry, resultRows)
  const defaultStudentSubjectForEntry = student => {
    if (view === 'see') {
      const eligibleSubject = subjectsForStudent(student, courses, baseSubjects)
        .filter(subject => !filters.subject || subjectMatchesValue(subjectValue(subject), filters.subject))
        .find(subject => hasInternalMarksForSubject(student, subject, resultRows))
      if (eligibleSubject) return subjectValue(eligibleSubject)
    }
    return defaultStudentSubject(student, filters.subject, subjectOptions, courses, baseSubjects, componentsBySubject, filters)
  }
  const studentHasEligibleSeeSubject = student => (
    view !== 'see' || subjectsForStudent(student, courses, baseSubjects)
      .filter(subject => !filters.subject || subjectMatchesValue(subjectValue(subject), filters.subject))
      .some(subject => hasInternalMarksForSubject(student, subject, resultRows))
  )
  const resultRowsForCurrentView = student => resultRows.filter(result => (
    Number(result.studentId) === Number(student.id) &&
    (isFaculty ? resultMatchesCurrentMode(result, view) : resultMatchesCurrentFilters(result, filters, view)) &&
    (!isFaculty || facultyCanAccessResult(result, student, facultyAssignmentsForUser))
  ))
  const resultRowsForSavedStudent = useMemo(() => {
    if (!savedMarksStudent) return []
    return resultRowsForCurrentView(savedMarksStudent)
  }, [filters, savedMarksStudent, resultRows, view])
  const selectedSubjectComponents = useMemo(() => {
    const selectedSubject = studentSubjects.find(subject => subjectMatchesValue(subjectValue(subject), studentResultSubject)) || { name: studentResultSubject }
    if (view === 'see') return seeResultComponents(selectedSubject)
    const created = findSubjectComponents(selectedSubject, componentsBySubject, {
      semester: modalStudent?.semester || filters.semester || selectedSubject.semester,
      academicYear: modalStudent?.academicYear || filters.academicYear,
    })
    if (created.length || !modalStudent || !studentResultSubject) return created
    const existing = resultRows.find(result => (
      Number(result.studentId) === Number(modalStudent.id) &&
      subjectMatchesValue(result.subject, studentResultSubject) &&
      String(result.examType).toUpperCase() === entryExamType
    ))
    const savedComponents = parseResultComponents(existing).map(component => ({
      id: component.id,
      name: component.name,
      maxMarks: Number(component.maxMarks),
    }))
    return savedComponents
  }, [componentsBySubject, entryExamType, filters.academicYear, filters.semester, modalStudent, resultRows, studentResultSubject, studentSubjects, view])
  const savedMarksRows = useMemo(() => {
    if (!savedMarksStudent) return []
    return resultRowsForCurrentView(savedMarksStudent)
  }, [filters, savedMarksStudent, resultRows, view])
  const selectedSubjectExported = isFaculty && view === 'internal' && filteredStudents.length > 0 && filteredStudents.every(student => (
    resultRowsForCurrentView(student).some(result => isResultShared(result))
  ))
  const seeResultsPublished = user?.role === 'ADMIN' && view === 'see' && filteredStudents.length > 0 && filteredStudents.every(student => (
    resultRowsForCurrentView(student).length > 0 && resultRowsForCurrentView(student).every(result => isResultShared(result))
  ))
  const updateComponentMarks = (component, rawValue) => {
    const value = String(rawValue || '')
    if (value === '') {
      setStudentComponentMarks(prev => ({ ...prev, [component.id]: '' }))
      return
    }
    const numericValue = Number(value)
    const maxMarks = Number(component.maxMarks || 0)
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return toast.error('Marks must be zero or more')
    }
    if (numericValue > maxMarks) {
      return toast.error(`${component.name} cannot exceed ${maxMarks} marks`)
    }
    setStudentComponentMarks(prev => ({ ...prev, [component.id]: value }))
  }

  const saveStudentResults = async () => {
    if (!canEditMarks) return toast.error('You can only view marks here')
    if (!modalStudent) return
      const subject = studentSubjects.find(row => subjectMatchesValue(subjectValue(row), studentResultSubject))
    if (!subject) return toast.error('Choose a subject')
    if (entryExamType === 'INTERNAL' && !studentRegisteredForSubject(modalStudent, subject)) {
      return toast.error('Cannot enter internal marks because this student has not registered this subject')
    }
    if (view === 'see' && !hasInternalMarksForSubject(modalStudent, subject, resultRows)) {
      return toast.error('Subject not eligible: faculty has not entered internal marks for this subject')
    }
    const components = view === 'see'
      ? seeResultComponents(subject)
      : componentsForMarkEntry(subject, componentsBySubject, {
        semester: modalStudent.semester || filters.semester || subject.semester,
        academicYear: modalStudent.academicYear || filters.academicYear,
      })
    const componentRows = components.map(component => ({
      ...component,
      marks: studentComponentMarks[component.id],
    }))
    if (componentRows.some(component => component.marks === undefined || component.marks === '')) {
      return toast.error('Enter marks for every component')
    }
    const invalidComponent = componentRows.find(component => (
      !Number.isFinite(Number(component.marks)) ||
      Number(component.marks) < 0 ||
      Number(component.marks) > Number(component.maxMarks)
    ))
    if (invalidComponent) {
      return toast.error(`${invalidComponent.name} must be between 0 and ${invalidComponent.maxMarks}`)
    }

    setSaving(true)
    try {
      const savedStudent = modalStudent
      const marksObtained = componentRows.reduce((sum, component) => sum + Number(component.marks), 0)
      const maxMarks = componentRows.reduce((sum, component) => sum + Number(component.maxMarks), 0)
      const existingResult = resultRows.find(result => (
        Number(result.studentId) === Number(modalStudent.id) &&
        subjectMatchesValue(result.subject, subjectValue(subject)) &&
        String(result.examType).toUpperCase() === entryExamType &&
        Number(result.semester) === Number(modalStudent.semester || filters.semester || subject.semester)
      ))
      const payload = {
        studentId: modalStudent.id,
        subject: subjectValue(subject),
        semester: Number(modalStudent.semester || filters.semester || subject.semester),
        examType: entryExamType,
        marksObtained,
        maxMarks,
        remarks: JSON.stringify({
          type: view === 'see' ? 'SEE_RESULT_DRAFT' : 'INTERNAL_COMPONENTS',
          published: false,
          exportedToAdmin: false,
          components: componentRows.map(component => ({
            id: component.id,
            name: component.name,
            maxMarks: Number(component.maxMarks),
            marks: Number(component.marks),
          })),
        }),
      }
      const resultId = editingResultId || existingResult?.id
      if (resultId) {
        await resultAPI.update(resultId, payload)
      } else {
        await resultAPI.add(payload)
      }
      toast.success(resultId ? 'Result updated successfully' : 'Result saved successfully')
      setModalStudent(null)
      setSavedMarksStudent(savedStudent)
      setMarks({})
      setStudentComponentMarks({})
      setStudentResultSubject('')
      setEditingSavedMarks(false)
      setEditingResultId('')
      await reloadResults(filteredStudents)
    } catch (err) {
      toast.error(resultSaveErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const reloadResults = async rows => {
    const groups = await Promise.all(rows.map(student => (
      resultAPI.getByStudent(student.id)
        .then(response => response.data.data || [])
        .catch(() => [])
    )))
    setResultRows(groups.flat())
  }

  const shareStudentResult = async (student, rows = []) => {
    const row = rows[0] || resultRowsForCurrentView(student)[0]
    if (!row) return toast.error('No saved result to share')
    const alreadyShared = isResultShared(row)
    if (alreadyShared && !window.confirm('This result was already exported. Do you want to export it again?')) return
    const key = `${student.id}-${row.subject || 'all'}-${row.semester || student.semester}`
    setSharingKey(key)
    try {
      await resultAPI.share({
        studentId: student.id,
        subject: row.subject,
        semester: row.semester || student.semester,
      })
      await reloadResults(filteredStudents)
      toast.success(alreadyShared ? 'Result re-exported successfully' : 'Result shared to admin and student')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not share result')
    } finally {
      setSharingKey('')
    }
  }

  const exportSubjectMarksToAdmin = async () => {
    if (adminInternalViewOnly) return toast.error('Admin can already view saved internal marks')
    if (!filters.subject) return toast.error('Select one subject before exporting')
    if (filteredStudents.length === 0) return toast.error('No students found for the selected filters')

    const missingStudents = filteredStudents.filter(student => resultRowsForCurrentView(student).length === 0)
    if (missingStudents.length) {
      return toast.error(`Enter marks for all students first. Pending: ${missingStudents.length}`)
    }
    if (selectedSubjectExported && !window.confirm('These marks were already exported. Do you want to export them again?')) return

    setExportingToAdmin(true)
    try {
      await Promise.all(filteredStudents.map(student => resultAPI.share({
        studentId: student.id,
        subject: filters.subject,
        semester: Number(filters.semester || student.semester),
      })))
      await reloadResults(filteredStudents)
      toast.success(selectedSubjectExported ? 'Subject marks re-exported to admin successfully' : 'All subject marks exported to admin internal results')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not export marks to admin')
    } finally {
      setExportingToAdmin(false)
    }
  }

  const publishSeeResults = async () => {
    if (user?.role !== 'ADMIN' || view !== 'see') return
    if (!filters.courseId || !filters.semester || !filters.academicYear) {
      return toast.error('Select course, academic year, and semester before publishing')
    }
    if (filteredStudents.length === 0) return toast.error('No students found for the selected filters')

    const missingStudents = filteredStudents.filter(student => resultRowsForCurrentView(student).length === 0)
    if (missingStudents.length) {
      return toast.error(`Enter SEE Results marks for all students first. Pending: ${missingStudents.length}`)
    }
    if (seeResultsPublished && !window.confirm('These results were already published/exported. Do you want to publish them again?')) return

    setExportingToAdmin(true)
    try {
      const publishRequests = filteredStudents.flatMap(student => (
        resultRowsForCurrentView(student).map(row => resultAPI.share({
          studentId: student.id,
          subject: row.subject,
          semester: Number(row.semester || filters.semester || student.semester),
        }))
      ))
      await Promise.all(publishRequests)
      await reloadResults(filteredStudents)
      toast.success(seeResultsPublished ? 'SEE Results re-published successfully' : 'SEE Results published to students')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not publish SEE Results')
    } finally {
      setExportingToAdmin(false)
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Results</h1>
        </div>
        {user?.role === 'ADMIN' && (
          <select
            className="form-input"
            value={view}
            onChange={event => navigate(event.target.value === 'see' ? '/results/see' : '/results/internal')}
            style={{ width: 210 }}
          >
            <option value="internal">Internal Results</option>
            <option value="see">SEE Results</option>
          </select>
        )}
      </div>

      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Search & Filters</h3>
          </div>
          {isFaculty && view === 'internal' && (
            <button className={`btn ${selectedSubjectExported ? 'btn-ghost' : 'btn-primary'} btn-sm`} onClick={exportSubjectMarksToAdmin} disabled={exportingToAdmin || loadingResults} style={selectedSubjectExported ? { opacity: 0.62 } : undefined}>
              {exportingToAdmin ? 'Exporting...' : selectedSubjectExported ? 'Re-export Marks' : 'Export Marks to Admin'}
            </button>
          )}
          {user?.role === 'ADMIN' && view === 'see' && (
            <button className={`btn ${seeResultsPublished ? 'btn-ghost' : 'btn-primary'} btn-sm`} onClick={publishSeeResults} disabled={exportingToAdmin || loadingResults} style={seeResultsPublished ? { opacity: 0.62 } : undefined}>
              {exportingToAdmin ? 'Publishing...' : seeResultsPublished ? 'Re-publish SEE Results' : 'Publish SEE Results'}
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
          {isFaculty ? (
            <ReadOnlyField label="Faculty Department" value={facultyDepartmentName} />
          ) : (
            <SelectField label="Course" value={filters.courseId} onChange={setFilter('courseId')} options={visibleCourses.map(course => [course.id, course.name])} placeholder="Select Course" />
          )}
          <SelectField label="Academic Year" value={filters.academicYear} onChange={setFilter('academicYear')} options={academicYears.map(year => [year, year])} placeholder="Select Academic Year" />
          <SelectField label="Semester" value={filters.semester} onChange={setFilter('semester')} options={semesters.map(semester => [semester, `Semester ${semester}`])} placeholder="Select Semester" />
          {!isAdminSeeView && (
            <SelectField label="Subject" value={filters.subject} onChange={setFilter('subject')} options={subjectOptions.map(subject => [subjectValue(subject), `${subjectDisplay(subject)}${subject.semester ? ` (Sem ${subject.semester})` : ''}`])} placeholder="Select Subject" />
          )}
          {!isAdminSeeView && (
            <div className="form-group">
              <label className="form-label">Student Search</label>
              <input className="form-input" value={studentSearch} onChange={event => setStudentSearch(event.target.value)} placeholder="Name or roll no." />
            </div>
          )}
        </div>
      </section>

      <section className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div className="table-card-header">
          <div>
            <h3>{view === 'internal' ? 'Internal Results' : 'SEE Results'}</h3>
          </div>
          {loadingResults && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading results...</span>}
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan="6">No students found for selected filters</td></tr>
              ) : filteredStudents.map(student => {
                const rows = resultRowsForCurrentView(student)
                const hasSavedResults = rows.length > 0
                const canAddSeeResult = studentHasEligibleSeeSubject(student)
                return (
                  <tr
                    key={student.id}
                    onClick={() => setSavedMarksStudent(student)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{student.fullName}</td>
                    <td className="mono">{student.rollNumber}</td>
                    <td>{student.courseName || selectedCourse?.name || '-'}</td>
                    <td>Semester {student.semester}</td>
                    <td>{student.academicYear || '-'}</td>
                    <td>
                      {!canEditMarks ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                          {hasSavedResults ? `View ${view === 'internal' ? 'internal' : 'result'} marks` : `No ${view === 'internal' ? 'internal' : 'result'} marks saved`}
                        </span>
                      ) : view === 'see' && !canAddSeeResult && !hasSavedResults ? (
                        <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
                          Subject not eligible
                        </span>
                      ) : hasSavedResults ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={event => {
                              event.stopPropagation()
                              openUpdateResults(student, rows)
                            }}
                          >
                            Update Marks
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-primary btn-sm" disabled={view === 'see' && !canAddSeeResult} onClick={event => { event.stopPropagation(); openAddResults(student) }}>
                          Add Results
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {savedMarksStudent && (
        <div className="overlay" onClick={event => event.target === event.currentTarget && setSavedMarksStudent(null)}>
          <div className="modal" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontWeight: 700 }}>Saved Marks</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                  {savedMarksStudent.fullName} ({savedMarksStudent.rollNumber}) - Semester {savedMarksStudent.semester}, {savedMarksStudent.academicYear || 'Academic year not set'}
                </p>
              </div>
              <button onClick={() => setSavedMarksStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>x</button>
            </div>
            <div className="modal-body">
              {savedMarksRows.length === 0 ? (
                <div className="empty-state compact">No saved marks found for this student</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Components</th>
                        <th>Entered Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedMarksRows.map(result => (
                        <tr key={result.id}>
                          <td>{result.subject}</td>
                          <td>
                            <ComponentSummary result={result} />
                          </td>
                          <td>{formatMarks(result)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSavedMarksStudent(null)}>Close</button>
              {canEditMarks && (
                <>
                  {view === 'internal' && (
                    <button className="btn btn-ghost" onClick={() => shareStudentResult(savedMarksStudent, savedMarksRows)} disabled={savedMarksRows.length === 0 || Boolean(sharingKey)} style={savedMarksRows.some(isResultShared) ? { opacity: 0.62 } : undefined}>
                      {sharingKey.startsWith(`${savedMarksStudent.id}-`) ? 'Sharing...' : savedMarksRows.some(isResultShared) ? 'Re-share Result' : 'Share Result'}
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={() => openUpdateResults(savedMarksStudent, savedMarksRows)} disabled={savedMarksRows.length === 0}>
                    Update Marks
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modalStudent && (
        <div className="overlay" onClick={event => event.target === event.currentTarget && (setModalStudent(null), setEditingSavedMarks(false), setEditingResultId(''))}>
          <div className="modal" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontWeight: 700 }}>{Object.keys(marks).length ? 'Update Marks' : view === 'see' ? 'Add SEE Results' : 'Add Results'}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                  {modalStudent.fullName} ({modalStudent.rollNumber})
                </p>
              </div>
              <button onClick={() => { setModalStudent(null); setEditingSavedMarks(false); setEditingResultId('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>x</button>
            </div>
            <div className="modal-body">
              {studentSubjects.length === 0 ? (
                <div className="empty-state compact">No registered subjects found for this student</div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  <SelectField label="Subject" value={studentResultSubject} onChange={event => {
                    const subject = event.target.value
                    const existing = resultRows.find(result => Number(result.studentId) === Number(modalStudent.id) && subjectMatchesValue(result.subject, subject) && String(result.examType).toUpperCase() === entryExamType)
                    setStudentResultSubject(subject)
                    setStudentComponentMarks(componentMarksFromResult(existing))
                    setEditingSavedMarks(Boolean(existing))
                    setEditingResultId(existing?.id || '')
                  }} options={studentSubjects.map(subject => [
                    subjectValue(subject),
                    view === 'see' && !hasInternalMarksForSubject(modalStudent, subject, resultRows)
                      ? `${subjectDisplay(subject)} - Subject not eligible`
                      : subjectDisplay(subject),
                  ])} placeholder="Choose Subject" />
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    Semester {modalStudent.semester} - {modalStudent.academicYear || 'Academic year not set'}
                  </div>
                  {view === 'see' && !selectedSubjectEligible ? (
                    <div className="empty-state compact">Subject not eligible: faculty has not entered internal marks for this subject.</div>
                  ) : selectedSubjectComponents.length === 0 ? (
                    <div className="empty-state compact">Ask admin to create components for this subject before entering marks</div>
                  ) : selectedSubjectComponents.map(component => (
                    <div key={component.id} style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 12, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{component.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Allocated marks: {component.maxMarks}</div>
                      </div>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        max={component.maxMarks}
                        value={studentComponentMarks[component.id] || ''}
                        onChange={event => updateComponentMarks(component, event.target.value)}
                        placeholder={`/${component.maxMarks}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setModalStudent(null); setEditingSavedMarks(false); setEditingResultId('') }}>Cancel</button>
              <button className="btn btn-primary" onClick={saveStudentResults} disabled={saving || studentSubjects.length === 0 || !selectedSubjectEligible}>
                {saving ? 'Saving...' : Object.keys(marks).length ? 'Update Marks' : 'Save Results'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function SelectField({ label, value, onChange, options, placeholder, disabled = false }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-input" value={value} onChange={onChange} disabled={disabled}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" value={value} readOnly />
    </div>
  )
}

function ComponentSummary({ result }) {
  const components = parseResultComponents(result)
  if (components.length === 0) {
    return <span style={{ color: 'var(--text-muted)' }}>No component breakdown</span>
  }
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {components.map(component => (
        <span key={component.id || component.name} style={{ fontSize: 12 }}>
          {component.name}: {component.marks ?? 0} / {component.maxMarks}
        </span>
      ))}
    </div>
  )
}

function dataOrEmpty(result) {
  return result.status === 'fulfilled' ? (result.value.data.data || []) : []
}

function semesterOptions(course) {
  const total = Number(course?.totalSemesters || 0)
  if (!Number.isFinite(total) || total <= 0) return []
  return Array.from({ length: total }, (_, index) => index + 1)
}

function resultMatchesCurrentFilters(result, filters, view) {
  const examType = String(result.examType || '').toUpperCase()
  const matchesExam = view === 'internal' ? examType === 'INTERNAL' : examType !== 'INTERNAL'
  const matchesSemester = !filters.semester || Number(result.semester) === Number(filters.semester)
  const matchesYear = !filters.academicYear || !result.academicYear || result.academicYear === filters.academicYear
  const matchesSubject = !filters.subject || subjectMatchesValue(result.subject, filters.subject)
  return matchesExam && matchesSemester && matchesYear && matchesSubject
}

function resultMatchesCurrentMode(result, view) {
  const examType = String(result.examType || '').toUpperCase()
  return view === 'internal' ? examType === 'INTERNAL' : examType !== 'INTERNAL'
}

function facultyCanAccessResult(result, student, assignments) {
  return (assignments || []).some(assignment => (
    studentMatchesAssignment(student, assignment) &&
    subjectMatchesValue(result.subject, assignmentSubjectValue(assignment))
  ))
}

// Components are now DB-backed (loaded from /api/erp/subject-components)
// Legacy localStorage helper kept for backward compatibility during migration
function readStoredComponents() {
  try { return JSON.parse(localStorage.getItem('sms_internal_result_components_clean') || '{}') } catch { return {} }
}

function parseResultComponents(result) {
  if (!result?.remarks) return []
  try {
    const data = JSON.parse(result.remarks)
    return Array.isArray(data.components) ? data.components : []
  } catch {
    return []
  }
}

function parseResultMeta(result) {
  if (!result?.remarks) return {}
  try {
    return JSON.parse(result.remarks)
  } catch {
    return {}
  }
}

function isResultShared(result) {
  // Use proper boolean fields (Fix 2); fall back to legacy JSON remarks for old data
  if (result?.published === true || result?.exportedToAdmin === true) return true
  // Legacy fallback for rows saved before the fix
  const meta = parseResultMeta(result)
  return meta.published === true || meta.exportedToAdmin === true
}

function hasInternalMarksForSubject(student, subject, rows) {
  if (!student || !subject) return false
  return (rows || []).some(result => (
    Number(result.studentId) === Number(student.id) &&
    String(result.examType || '').toUpperCase() === 'INTERNAL' &&
    Number(result.semester || student.semester) === Number(student.semester) &&
    subjectMatchesValue(result.subject, subjectValue(subject))
  ))
}

function componentMarksFromResult(result) {
  return parseResultComponents(result).reduce((acc, component) => ({
    ...acc,
    [component.id]: component.marks ?? '',
  }), {})
}

function studentSearchMatches(student, search) {
  const q = search.trim().toLowerCase()
  return (
    String(student.fullName || '').toLowerCase().includes(q) ||
    String(student.rollNumber || '').toLowerCase().includes(q)
  )
}

function assignmentSubjectName(assignment) {
  const subject = assignment?.subject
  if (typeof subject === 'string') return subject
  return subject?.name || assignment?.subjectName || ''
}

function assignmentSubjectValue(assignment) {
  const subject = assignment?.subject
  if (subject && typeof subject === 'object') return subjectValue({
    code: subject.code || assignment?.subjectCode,
    name: subject.name || assignment?.subjectName,
  })
  return subjectValue({ code: assignment?.subjectCode, name: assignmentSubjectName(assignment) })
}

function subjectValue(subject) {
  const code = String(subject?.code || subject?.subjectCode || '').trim()
  const name = String(subject?.name || subject?.subjectName || '').trim()
  if (code && name) return `${code} - ${name}`
  return name || code
}

function subjectDisplay(subject) {
  return subjectValue(subject) || 'Subject'
}

function subjectMatchesValue(left, right) {
  const a = String(left || '').trim()
  const b = String(right || '').trim()
  if (!a || !b) return false
  if (a.toLowerCase() === b.toLowerCase()) return true
  const normalizedA = normalizedSubjectName(a)
  const normalizedB = normalizedSubjectName(b)
  if (normalizedA === normalizedB) return true
  const nameA = normalizedSubjectName(subjectNamePart(a))
  const nameB = normalizedSubjectName(subjectNamePart(b))
  return Boolean(nameA && nameB && nameA === nameB && (hasSubjectCodePart(a) || hasSubjectCodePart(b)))
}

function subjectNamePart(value) {
  const text = String(value || '')
  return text.includes(' - ') ? text.split(' - ').slice(1).join(' - ') : text
}

function hasSubjectCodePart(value) {
  return String(value || '').includes(' - ')
}

function defaultStudentSubject(student, selectedSubject, subjectOptions, courses, baseSubjects, componentsBySubject = {}, filters = {}) {
  if (selectedSubject) return selectedSubject
  const rows = subjectsForStudent(student, courses, subjectOptions.length ? subjectOptions : baseSubjects)
  const componentSubject = rows.find(subject => (
    findSubjectComponents(subject, componentsBySubject, {
      semester: student.semester || filters.semester,
      academicYear: student.academicYear || filters.academicYear,
    }).length
  ))
  if (componentSubject) return subjectValue(componentSubject)
  return rows[0] ? subjectValue(rows[0]) : ''
}

function findSubjectComponents(subject, componentsBySubject = {}, scope = {}) {
  if (!subject?.name && !subject?.code) return []
  // Primary: look up by subject DB id (DB-backed components)
  const subjectId = subject.id || subject.subjectId
  if (subjectId && componentsBySubject[subjectId]?.length) {
    return componentsBySubject[subjectId]
  }
  // Fallback: legacy key-based lookup
  const keys = subjectComponentKeys(subject, scope)
  for (const key of keys) {
    const rows = componentsBySubject[key]
    if (Array.isArray(rows) && rows.length) return rows
  }
  const subjectCode = String(subject.code || '').trim().toLowerCase()
  const branchCode = String(scope.branchCode || subject.branchCode || subject.branch?.code || '').trim().toLowerCase()
  const entry = Object.entries(componentsBySubject).find(([key, rows]) => (
    Array.isArray(rows) && rows.length && subjectCode && branchCode &&
    key.toLowerCase().includes(subjectCode) && key.toLowerCase().includes(branchCode)
  ))
  return entry?.[1] || []
}

function componentsForMarkEntry(subject, componentsBySubject = {}, scope = {}) {
  return findSubjectComponents(subject, componentsBySubject, scope)
}

function seeResultComponents(subject) {
  const prefix = normalizedSubjectName(subject?.name || subject?.code || 'SEE').replaceAll(' ', '-')
  return [{ id: `${prefix}-see-result`, name: 'SEE Result Marks', maxMarks: 100 }]
}

function subjectComponentKeys(subject, scope = {}) {
  const names = uniqueStrings([
    subject.name,
    subject.subjectName,
    subjectValue(subject),
    subject.code ? `${subject.code} - ${subject.name || ''}`.trim() : '',
  ])
  const semesters = uniqueStrings([scope.semester, subject.semester, subject.semesterNumber])
  const years = uniqueStrings([scope.academicYear, 'any-year'])
  const branchCodes = uniqueStrings([scope.branchCode, subject.branchCode, subject.branch?.code])
  const subjectIds = uniqueStrings([subject.id, subject.subjectId])
  const keys = []

  names.forEach(name => {
    semesters.forEach(semester => {
      years.forEach(academicYear => {
        branchCodes.forEach(branchCode => {
          subjectIds.forEach(subjectId => {
            keys.push(componentScopeKey({ academicYear, semester, subject: name, subjectId, branchCode }))
          })
          keys.push(componentScopeKey({ academicYear, semester, subject: name, branchCode }))
        })
      })
    })
  })
  return [...new Set(keys.filter(Boolean))]
}

function normalizedSubjectName(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

function componentScopeKey({ academicYear, semester, subject, subjectId, branchCode }) {
  return [branchCode || 'course', academicYear || 'any-year', semester || 'any-semester', subjectId || subject || ''].join('|')
}

function normalizeSubjects(rows) {
  return rows.map(row => ({
    id: row.id,
    code: row.code,
    name: row.name,
    branchCode: row.branch?.code || row.branchCode || '',
    semester: row.semester?.number || row.semester || row.semesterNumber,
  }))
}

function subjectsForStudent(student, courses, subjects) {
  const course = courses.find(row => Number(row.id) === Number(student.courseId))
  const courseCode = normalizedBranchCode(courseBranchCode(course || { code: student.courseCode, name: student.courseName }))
  const rows = subjects.filter(subject => {
    const subjectCode = normalizedBranchCode(subject.branchCode || subject.branch?.code || '')
    const matchesCourse = !subjectCode || subjectCode === courseCode || (['AI', 'AIDS'].includes(courseCode) && ['AI', 'AIDS'].includes(subjectCode))
    const matchesSemester = !subject.semester || Number(subject.semester) === Number(student.semester)
    return matchesCourse && matchesSemester
  })
  if (rows.length) return rows

  const semesterRows = subjects.filter(subject => (
    !subject.semester || Number(subject.semester) === Number(student.semester)
  ))
  if (semesterRows.length) return semesterRows

  return []
}

function uniqueSortedNumbers(values) {
  return [...new Set((values || []).map(value => Number(value)).filter(Boolean))].sort((a, b) => a - b)
}

function uniqueStrings(values) {
  return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))]
}

function normalizedBranchCode(value) {
  const code = String(value || '').trim().toUpperCase()
  if (code.startsWith('BTECH-')) return code.replace('BTECH-', '')
  if (code === 'CS') return 'CSE'
  if (code === 'EC') return 'ECE'
  if (code === 'MC') return 'MCA'
  if (code === 'MB') return 'MBA'
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
  const matchesSemester = Number(student.semester) === Number(assignment?.semester)
  const studentSection = String(student.section || '').trim().toLowerCase()
  const assignmentSection = String(assignment?.section || '').trim().toLowerCase()
  if (!studentSection) return false
  const matchesSection = !assignmentSection || assignmentSection === studentSection
  const matchesYear = !assignment?.academicYear || !student.academicYear || String(assignment.academicYear).trim() === String(student.academicYear).trim()
  return matchesCourse && matchesSemester && matchesSection && matchesYear
}

function scopeStudentsForFaculty(rows, assignments) {
  if (!assignments.length) return []
  const scopedRows = (rows || []).filter(student => assignments.some(assignment => studentMatchesAssignment(student, assignment)))
  return scopedRows.length ? scopedRows : filterStudentsByFacultyDepartment(rows, assignments)
}

function filterStudentsByFacultyDepartment(rows, assignments) {
  const departmentCodes = new Set((assignments || []).map(assignmentBranchCode).filter(Boolean))
  const departmentNames = new Set((assignments || []).map(assignmentBranchName).filter(Boolean))
  if (!departmentCodes.size && !departmentNames.size) return []
  return (rows || []).filter(student => {
    const studentCode = normalizedBranchCode(student.courseCode || student.courseName || student.branch || '')
    const studentName = normalizedName(student.courseName || student.branch || '')
    return departmentCodes.has(studentCode) || [...departmentNames].some(name => (
      studentName && (studentName === name || studentName.includes(name) || name.includes(studentName))
    ))
  })
}

function sortStudentRows(rows, sortMode) {
  const [field, direction] = String(sortMode || 'name-asc').split('-')
  const multiplier = direction === 'desc' ? -1 : 1
  return [...(rows || [])].sort((a, b) => {
    const valueA = field === 'semester' ? Number(a.semester || 0) : field === 'roll' ? a.rollNumber : a.fullName
    const valueB = field === 'semester' ? Number(b.semester || 0) : field === 'roll' ? b.rollNumber : b.fullName
    if (typeof valueA === 'number' && typeof valueB === 'number') return (valueA - valueB) * multiplier
    return String(valueA || '').localeCompare(String(valueB || ''), undefined, { numeric: true, sensitivity: 'base' }) * multiplier
  })
}

function isStudentEligibleForMarks(student, examType) {
  if (!String(student.section || '').trim()) return false
  if (examType !== 'INTERNAL') return true
  return parseRegisteredSubjects(student.registeredSubjects).length > 0
}

function parseRegisteredSubjects(value) {
  return String(value || '').split('||').map(item => item.trim()).filter(Boolean)
}

function studentRegisteredForSubject(student, subject) {
  const registeredSubjects = parseRegisteredSubjects(student?.registeredSubjects)
  if (!registeredSubjects.length) return false
  const values = uniqueStrings([
    subjectValue(subject),
    subject?.name,
    subject?.subjectName,
    subject?.code,
    subject?.code && subject?.name ? `${subject.code} - ${subject.name}` : '',
  ])
  return registeredSubjects.some(registered => values.some(value => subjectMatchesValue(registered, value)))
}

function uniqueSubjectsFromAssignments(assignments) {
  const rows = new Map()
  ;(assignments || []).forEach(assignment => {
    const subject = assignment?.subject || {}
    const id = subject.id || assignment?.subjectId || assignment?.id
    const name = subject.name || assignment?.subjectName || (typeof assignment?.subject === 'string' ? assignment.subject : '')
    const code = subject.code || assignment?.subjectCode || ''
    if (!id || (!name && !code)) return
    rows.set(String(id), {
      id,
      code,
      name,
      branchCode: subject.branch?.code || subject.branchCode || assignmentBranchCode(assignment),
      semester: subject.semester?.number || subject.semester || assignment?.semester || '',
    })
  })
  return [...rows.values()]
}

function facultyDepartmentLabel(assignments) {
  const department = assignments.find(assignment => assignment?.faculty?.department)?.faculty?.department || {}
  const code = String(department.code || '').trim()
  const name = String(department.name || '').trim()
  if (code && name) return `${code} - ${name}`
  return name || code || 'Assigned Department'
}

function subjectMatchesCourse(subject, course) {
  const courseCode = normalizedBranchCode(courseBranchCode(course))
  const subjectCode = normalizedBranchCode(subject.branchCode || subject.branch?.code || '')
  if (!subjectCode) return false
  if (courseCode === subjectCode) return true
  return ['AI', 'AIDS'].includes(courseCode) && ['AI', 'AIDS'].includes(subjectCode)
}

function courseBranchCode(course) {
  const code = String(course?.code || '').toUpperCase()
  const name = String(course?.name || '').toUpperCase()
  if (code.startsWith('BTECH-')) return code.replace('BTECH-', '')
  if (code.startsWith('BTECH')) return code.replace('BTECH', '').replace(/^\W+/, '')
  if (code) return code
  if (name.includes('COMPUTER SCIENCE')) return 'CSE'
  if (name.includes('ELECTRONICS')) return 'ECE'
  if (name.includes('DATA SCIENCE')) return 'AIDS'
  if (name.includes('ARTIFICIAL')) return 'AI'
  if (name.includes('MECHANICAL')) return 'ME'
  if (name.includes('COMPUTER APPLICATION')) return 'MCA'
  if (name.includes('BUSINESS ADMINISTRATION')) return 'MBA'
  return ''
}

function formatMarks(result) {
  if (!result) return '0 / 100'
  return `${result.marksObtained ?? 0} / ${result.maxMarks ?? 100}`
}

function resultSaveErrorMessage(err) {
  const message = err.response?.data?.message || ''
  if (
    err.response?.status === 409 ||
    message.toLowerCase().includes('duplicate') ||
    message.toLowerCase().includes('constraint') ||
    message.toLowerCase().includes('could not execute statement')
  ) {
    return 'Marks for this student and subject already exist. The existing record was not overwritten by the backend.'
  }
  return message || 'Failed to save results'
}
