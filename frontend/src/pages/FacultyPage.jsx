import { useEffect, useState } from 'react'
import { Edit2, Plus, RefreshCw, Trash2, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI, erpAPI, studentAPI, userAPI } from '../services/api'

export default function FacultyPage() {
  const [faculty, setFaculty] = useState([])
  const [assignments, setAssignments] = useState([])
  const [courses, setCourses] = useState([])
  const [options, setOptions] = useState({ departments: [], subjects: [], academicYears: [] })
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [assignmentModal, setAssignmentModal] = useState(false)
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [deletingAssignmentId, setDeletingAssignmentId] = useState(null)
  const [editingFaculty, setEditingFaculty] = useState(null)
  const [form, setForm] = useState(emptyFaculty())
  const [assignmentBlocks, setAssignmentBlocks] = useState([emptyAssignment()])
  const [sortDepartment, setSortDepartment] = useState('')

  const loadData = async () => {
    setLoading(true)
    const [courseRes, facultyRes, assignmentRes, deptRes, subjectRes, usersRes, studentFilterRes] = await Promise.allSettled([
      courseAPI.getAll(),
      erpAPI.faculty(),
      erpAPI.assignments(),
      erpAPI.departments(),
      erpAPI.subjects(),
      userAPI.getAll(),
      studentAPI.filters(),
    ])
    const facultyRows = mergeFacultyUsers(dataOrEmpty(facultyRes), dataOrEmpty(usersRes))
    setCourses(dataOrEmpty(courseRes))
    setFaculty(facultyRows)
    setAssignments(dataOrEmpty(assignmentRes))
    setOptions({
      departments: dataOrEmpty(deptRes),
      subjects: dataOrEmpty(subjectRes),
      academicYears: studentFilterRes.status === 'fulfilled' ? studentFilterRes.value?.data?.data?.academicYears || [] : [],
    })
    setSelectedFaculty(current => current ? facultyRows.find(row => row.id === current.id) || null : null)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const nextEmployeeCode = generateEmployeeCode(faculty)
  const departmentOptions = options.departments || []
  const selectedAssignments = assignments.filter(row => row.faculty?.id === selectedFaculty?.id)
  const academicYearOptions = uniqueStrings([
    ...(options.academicYears || []),
    ...assignments.map(row => row.academicYear),
  ])
  const sortedFaculty = faculty
    .filter(row => !sortDepartment || String(row.department?.id || '') === String(sortDepartment))
    .sort(facultyDepartmentSort)
  const activeFaculty = faculty.filter(row => row.active !== false)

  const openAdd = () => {
    const employeeCode = nextEmployeeCode
    setEditingFaculty(null)
    setForm({ ...emptyFaculty(), employeeCode, username: employeeCode.toLowerCase() })
    setModal(true)
  }

  const openEdit = (row) => {
    const departmentRow = row.department || {}
    setEditingFaculty(row)
    setForm({
      ...emptyFaculty(),
      id: row.id,
      employeeCode: row.employeeCode || '',
      fullName: row.fullName || '',
      email: row.email || '',
      phone: row.phone || '',
      designation: row.designation || 'Assistant Professor',
      username: row.username || String(row.employeeCode || '').toLowerCase(),
      password: '',
      departmentId: departmentRow.id || (departmentRow.code ? `course:${departmentRow.code}` : ''),
      active: row.active === false ? 'INACTIVE' : 'ACTIVE',
    })
    setModal(true)
  }

  const selectFaculty = (row) => {
    setSelectedFaculty(row)
    setAssignmentBlocks([emptyAssignment()])
    setAssignmentModal(true)
  }

  const saveFaculty = async () => {
    const employeeCode = form.employeeCode || nextEmployeeCode
    const username = form.username || employeeCode.toLowerCase()
    const selectedDepartment = departmentOptions.find(item => String(item.id) === String(form.departmentId))
    if (!form.fullName || !form.email || !username) {
      return toast.error('Fill faculty required fields')
    }
    if (!editingFaculty && !form.password) return toast.error('Enter faculty password')
    if (!form.active) return toast.error('Select faculty status')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error('Enter a valid faculty email')
    if (!form.phone) return toast.error('Enter faculty phone number')
    if (!/^[6-9]\d{9}$/.test(form.phone)) return toast.error('Phone number must be 10 digits and start with 6, 7, 8, or 9')
    setSaving(true)
    try {
      const payload = {
        id: editingFaculty?.id,
        employeeCode,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        designation: form.designation,
        username,
        ...(form.password ? { password: form.password } : {}),
        departmentId: selectedDepartment?.id || null,
        department: selectedDepartment && numericId(selectedDepartment.id) ? selectedDepartment : null,
        active: form.active !== 'INACTIVE',
      }
      await erpAPI.saveFaculty(payload)
      toast.success(editingFaculty ? 'Faculty updated' : 'Faculty added')
      setForm(emptyFaculty())
      setEditingFaculty(null)
      setModal(false)
      await loadData()
    } catch (err) {
      if (isInvalidJsonError(err)) {
        toast.success('Faculty saved. Refreshing faculty list...')
        setForm(emptyFaculty())
        setEditingFaculty(null)
        setModal(false)
        await loadData()
        return
      }
      toast.error(cleanError(err, 'Could not add faculty'))
    } finally {
      setSaving(false)
    }
  }

  const updateAssignmentBlock = (index, patch) => {
    setAssignmentBlocks(prev => prev.map((block, blockIndex) => (
      blockIndex === index ? { ...block, ...patch } : block
    )))
  }

  const setAssignmentSemester = (index, semester) => {
    updateAssignmentBlock(index, { semester, section: 'A', subjectIds: [] })
  }

  const saveAssignments = async () => {
    if (!selectedFaculty) return toast.error('Select a faculty first')
    const validBlocks = assignmentBlocks.filter(block => block.academicYear && block.semester && block.section && block.subjectIds.length > 0)
    if (validBlocks.length === 0) return toast.error('Add at least one academic year, semester, division, and subject')

    for (const block of validBlocks) {
      if (!isValidAcademicYear(block.academicYear)) return toast.error('Academic year must be in YYYY-YY format, for example 2025-26')
      const existingSemesterAssignment = selectedAssignments.find(row =>
        String(row.semester) === String(block.semester) &&
        String(row.academicYear || '') === String(block.academicYear || '')
      )
      if (existingSemesterAssignment) {
        return toast.error(`${selectedFaculty.fullName} is already allocated to Semester ${block.semester} for ${block.academicYear}`)
      }
      const duplicateSubjects = block.subjectIds.filter(subjectId =>
        selectedAssignments.some(row =>
          String(row.academicYear || '') === String(block.academicYear || '') &&
          String(row.semester) === String(block.semester) &&
          String(row.subject?.id) === String(subjectId)
        )
      )
      if (duplicateSubjects.length) return toast.error(`One or more ${block.academicYear} Semester ${block.semester} subjects are already assigned`)

      const globallyAssignedSubject = block.subjectIds
        .map(subjectId => {
          const assignment = assignments.find(row =>
            String(row.academicYear || '') === String(block.academicYear || '') &&
            String(row.semester) === String(block.semester) &&
            String(row.section || '') === String(block.section || '') &&
            String(row.subject?.id || row.subjectId || '') === String(subjectId) &&
            String(row.faculty?.id || '') !== String(selectedFaculty.id)
          )
          if (!assignment) return null
          const blockSubject = (options.subjects || []).find(subject => String(subject.id) === String(subjectId))
          return {
            subjectName: blockSubject?.name || assignment.subject?.name || assignment.subjectName || 'This subject',
            facultyName: assignment.faculty?.fullName || assignment.facultyName || 'another faculty',
          }
        })
        .find(Boolean)

      if (globallyAssignedSubject) {
        return toast.error(`${globallyAssignedSubject.subjectName} for ${block.academicYear}, Semester ${block.semester}, Division ${block.section} is already assigned to ${globallyAssignedSubject.facultyName}`)
      }
    }

    setAssigning(true)
    try {
      const requests = validBlocks.flatMap(block => {
        const blockSubjects = subjectsForFacultySemester(selectedFaculty, options.subjects || [], block.semester)
        return block.subjectIds
          .map(id => blockSubjects.find(subject => String(subject.id) === String(id)))
          .filter(Boolean)
          .map(subject => erpAPI.saveAssignment({
            faculty: { id: selectedFaculty.id },
            subject: { id: subject.id },
            branch: subject.branch?.id ? { id: subject.branch.id } : null,
            semester: Number(block.semester),
            section: block.section,
            academicYear: block.academicYear,
            active: true,
          }))
      })
      await Promise.all(requests)
      toast.success('Faculty assignment saved')
      setAssignmentBlocks([emptyAssignment()])
      await loadData()
    } catch (err) {
      toast.error(cleanError(err, 'Could not save faculty assignment'))
    } finally {
      setAssigning(false)
    }
  }

  const deleteAssignment = async (assignment) => {
    if (!assignment?.id) return
    const subjectName = assignment.subject?.name || assignment.subjectName || 'this subject'
    if (!window.confirm(`Delete assigned subject "${subjectName}" from this faculty?`)) return

    setDeletingAssignmentId(assignment.id)
    try {
      await erpAPI.deleteFacultyAssignment(assignment.id)
      toast.success('Assigned subject deleted')
      await loadData()
    } catch (err) {
      toast.error(cleanError(err, 'Could not delete assigned subject'))
    } finally {
      setDeletingAssignmentId(null)
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Faculty Management</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:2 }}>
            Add and manage faculty profile details
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Faculty
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom:20 }}>
        <Metric label="Departments" value={departmentOptions.length} tone="#10b981" />
        <Metric label="Active Profiles" value={activeFaculty.length} tone="#f59e0b" />
      </div>

      <section className="card" style={{ padding:0 }}>
        <div className="table-card-header">
          <div>
            <h3>Faculty Directory</h3>
            <p>Faculty sorted by department</p>
          </div>
          <UserPlus size={20} />
        </div>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'minmax(220px, 360px)', gap: 14 }}>
          <Select
            label="Sort / Filter Department"
            value={sortDepartment}
            onChange={setSortDepartment}
            options={departmentOptions.map(dept => [dept.id, `${dept.code} - ${dept.name}`])}
            placeholder="All Departments"
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Department</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFaculty.length === 0 ? (
                <tr><td colSpan="8">No faculty found</td></tr>
              ) : sortedFaculty.map(row => (
                <tr key={row.id} onClick={() => !row.userOnly && selectFaculty(row)} style={{ cursor: row.userOnly ? 'default' : 'pointer' }}>
                  <td>{row.fullName || '-'}</td>
                  <td>{departmentLabel(row)}</td>
                  <td>{row.email || '-'}</td>
                  <td>{row.phone || '-'}</td>
                  <td>{row.designation || '-'}</td>
                  <td><span className={`badge ${row.active === false ? 'badge-gray' : 'badge-green'}`}>{row.active === false ? 'INACTIVE' : 'ACTIVE'}</span></td>
                  <td>{row.userOnly ? 'Login only' : `${assignments.filter(item => item.faculty?.id === row.id).length} subjects`}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={(event) => { event.stopPropagation(); openEdit(row) }} disabled={row.userOnly} title={row.userOnly ? 'Create a faculty profile to edit assignments' : 'Edit faculty'}>
                      <Edit2 size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {assignmentModal && selectedFaculty && (
        <AdminModal title={`Assign ${selectedFaculty.fullName}`} onClose={() => setAssignmentModal(false)}>
          <div className="grid-2" style={{ marginBottom: 18 }}>
            <ReadOnlyInput label="Department" value={selectedFaculty.department?.name || selectedFaculty.department?.code || '-'} />
            <ReadOnlyInput label="Designation" value={selectedFaculty.designation || '-'} />
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {assignmentBlocks.map((block, index) => {
              const existingSemesterAssignment = selectedAssignments.find(row =>
                String(row.semester) === String(block.semester) &&
                String(row.academicYear || '') === String(block.academicYear || '')
              )
              const availableSemesters = semesterOptionsForFaculty(selectedFaculty, options.subjects || [], courses)
              const blockSubjects = subjectsForFacultySemester(selectedFaculty, options.subjects || [], block.semester)
              const semesterLocked = Boolean(existingSemesterAssignment)
              return (
                <div key={index} className="card" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="grid-2">
                    <Input
                      label="Academic Year"
                      value={block.academicYear}
                      onChange={value => updateAssignmentBlock(index, { academicYear: normalizeAcademicYearInput(value), subjectIds: [] })}
                    />
                    <Select
                      label="Semester"
                      value={block.semester}
                      onChange={value => setAssignmentSemester(index, value)}
                      options={availableSemesters.map(n => [n, `Semester ${n}`])}
                      placeholder="Select Semester"
                    />
                    <Select
                      label={semesterLocked ? `Division (${block.academicYear} Semester ${block.semester} already allocated)` : 'Division'}
                      value={block.section}
                      onChange={value => updateAssignmentBlock(index, { section: value })}
                      options={['A','B','C','D'].map(section => [section, section])}
                      disabled={semesterLocked}
                    />
                    {semesterLocked ? (
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Semester {block.semester} Subjects</label>
                        <div className="form-input" style={{ minHeight: 48, color: 'var(--text-muted)' }}>
                          {selectedFaculty.fullName} is already allocated to {block.academicYear} Semester {block.semester}
                        </div>
                      </div>
                    ) : (
                      <MultiSelect
                        label={`Semester ${block.semester} Subjects`}
                        value={block.subjectIds}
                        onChange={subjectIds => updateAssignmentBlock(index, { subjectIds })}
                        options={blockSubjects.map(subject => [subject.id, `${subject.code} - ${subject.name}`])}
                        emptyText={`No ${selectedFaculty.department?.code || ''} subjects found for Semester ${block.semester}`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setAssignmentBlocks(prev => [...prev, emptyAssignment()])}>Add Another Semester</button>
            <button className="btn btn-primary" onClick={saveAssignments} disabled={assigning}>
              {assigning ? 'Assigning...' : 'Save Assignments'}
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 18 }}>
            <table>
              <thead>
                <tr>
                  <th>Semester</th>
                  <th>Academic Year</th>
                  <th>Division</th>
                  <th>Subject</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedAssignments.length === 0 ? (
                  <tr><td colSpan="5">No subjects assigned yet</td></tr>
                ) : selectedAssignments.map(row => (
                  <tr key={row.id}>
                    <td>Semester {row.semester || '-'}</td>
                    <td>{row.academicYear || '-'}</td>
                    <td>{row.section || '-'}</td>
                    <td>{row.subject?.name || row.subjectName || '-'}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => deleteAssignment(row)}
                        disabled={deletingAssignmentId === row.id}
                        title="Delete assigned subject"
                      >
                        <Trash2 size={14} /> {deletingAssignmentId === row.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminModal>
      )}

      {modal && (
        <AdminModal title={editingFaculty ? 'Edit Faculty' : 'Add Faculty'} onClose={() => { setModal(false); setEditingFaculty(null) }}>
          <div className="grid-2">
            <Input label="Full Name *" value={form.fullName} onChange={value => setForm(p => ({ ...p, fullName: value }))} />
            <Input label="Email *" value={form.email} onChange={value => setForm(p => ({ ...p, email: value }))} />
            <Input label="Phone *" value={form.phone} onChange={value => setForm(p => ({ ...p, phone: onlyDigits(value).slice(0, 10) }))} inputMode="numeric" maxLength={10} />
            <Input label="Username *" value={form.username} onChange={value => setForm(p => ({ ...p, username: value }))} />
            <Input label={editingFaculty ? 'New Password' : 'Password *'} value={form.password} onChange={value => setForm(p => ({ ...p, password: value }))} type="password" />
            <Input label="Designation" value={form.designation} onChange={value => setForm(p => ({ ...p, designation: value }))} />
            <Select label="Department" value={form.departmentId} onChange={value => setForm(p => ({ ...p, departmentId: value }))} options={departmentOptions.map(dept => [dept.id, `${dept.code} - ${dept.name}`])} placeholder="Select Department" />
            <Select label="Status *" value={form.active} onChange={value => setForm(p => ({ ...p, active: value }))} options={[['ACTIVE', 'Active'], ['INACTIVE', 'Inactive']]} placeholder="Select Status" />
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => { setModal(false); setEditingFaculty(null) }}>Cancel</button>
            <button className="btn btn-primary" onClick={saveFaculty} disabled={saving}>{saving ? 'Saving...' : editingFaculty ? 'Update Faculty' : 'Add Faculty'}</button>
          </div>
        </AdminModal>
      )}
    </div>
  )
}

function emptyFaculty() {
  return {
    id: '', employeeCode: '', fullName: '', email: '', phone: '', designation: '',
    username: '', password: '', departmentId: '', active: '',
  }
}

function emptyAssignment() {
  return { academicYear: '', semester: '', section: 'A', subjectIds: [] }
}

function generateEmployeeCode(rows) {
  const codes = (rows || []).map(row => row.employeeCode)
  const max = codes.reduce((highest, code) => {
    const match = String(code || '').match(/FAC(\d+)/i)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0)
  const next = max + 1
  return `FAC${String(next).padStart(3, '0')}`
}

function dataOrEmpty(result) {
  return result.status === 'fulfilled' ? result.value?.data?.data || [] : []
}

function mergeFacultyUsers(facultyRows, users) {
  const rows = [...(facultyRows || [])]
  const existingUsernames = new Set(rows.map(row => String(row.username || '').toLowerCase()).filter(Boolean))
  ;(users || [])
    .filter(user => user.role === 'FACULTY')
    .filter(user => !existingUsernames.has(String(user.username || '').toLowerCase()))
    .forEach(user => rows.push({
      id: `user-${user.id}`,
      userId: user.id,
      employeeCode: user.username || `FAC${user.id}`,
      fullName: user.fullName || user.username || 'Faculty',
      email: user.email || '',
      username: user.username || '',
      phone: user.phone || '',
      designation: '',
      department: {},
      active: user.active !== false,
      userOnly: true,
    }))
  return rows
}

function subjectSemesterNumber(subject) {
  const raw = subject?.semester?.number ?? subject?.semesterNumber ?? subject?.semester
  if (typeof raw === 'object' && raw !== null) {
    const objectRaw = raw.number ?? raw.name ?? raw.label
    const objectMatch = String(objectRaw || '').match(/\d+/)
    return objectMatch ? Number(objectMatch[0]) : null
  }
  const match = String(raw || '').match(/\d+/)
  return match ? Number(match[0]) : null
}

function subjectsForFacultySemester(faculty, subjects, semester) {
  return (subjects || []).filter(subject => (
    subjectSemesterNumber(subject) === Number(semester) &&
    subjectMatchesFacultyDepartment(subject, faculty)
  ))
}

function semesterOptionsForFaculty(faculty, subjects, courses) {
  const course = courseForFacultyDepartment(faculty, courses)
  if (course) return semesterOptionsForCourse(course)
  return uniqueSortedNumbers((subjects || [])
    .filter(subject => subjectMatchesFacultyDepartment(subject, faculty))
    .map(subject => subjectSemesterNumber(subject)))
}

function courseForFacultyDepartment(faculty, courses) {
  const department = faculty?.department || {}
  const deptCode = normalizedBranchCode(department.code || '')
  const deptName = normalizedName(department.name || '')
  return (courses || []).find(course => {
    const courseCode = normalizedBranchCode(course.code || '')
    const courseName = normalizedName(course.name || '')
    return (
      Boolean(deptCode && courseCode && deptCode === courseCode) ||
      Boolean(deptCode && courseName && normalizedBranchCode(courseName) === deptCode) ||
      Boolean(deptName && courseName && namesOverlap(deptName, courseName))
    )
  })
}

function semesterOptionsForCourse(course) {
  const total = Number(course?.totalSemesters || 0)
  if (!Number.isFinite(total) || total <= 0) return []
  return Array.from({ length: total }, (_, index) => index + 1)
}

function subjectMatchesFacultyDepartment(subject, faculty) {
  const facultyDepartment = faculty?.department || {}
  const facultyDeptId = String(facultyDepartment.id || '')
  const facultyDeptCode = normalizedBranchCode(facultyDepartment.code)
  const facultyDeptName = normalizedName(facultyDepartment.name)
  const subjectDepartment = subject?.branch?.department || subject?.department || {}
  const subjectDeptId = String(subjectDepartment.id || '')
  const subjectDeptCode = normalizedBranchCode(subjectDepartment.code)
  const subjectDeptName = normalizedName(subjectDepartment.name)
  const branchCode = normalizedBranchCode(subject?.branch?.code || subject?.branchCode || '')
  const branchName = normalizedName(subject?.branch?.name || subject?.branchName || '')

  if (facultyDeptId && subjectDeptId && facultyDeptId === subjectDeptId) return true
  if (facultyDeptCode && subjectDeptCode && facultyDeptCode === subjectDeptCode) return true
  if (facultyDeptCode && branchCode && (branchCode === facultyDeptCode || branchCode.includes(facultyDeptCode) || facultyDeptCode.includes(branchCode))) return true
  if (facultyDeptName && subjectDeptName && namesOverlap(facultyDeptName, subjectDeptName)) return true
  if (facultyDeptName && branchName && namesOverlap(facultyDeptName, branchName)) return true
  return !facultyDeptId && !facultyDeptCode
}

function normalizedBranchCode(value) {
  const code = String(value || '').trim().toUpperCase().replace('BTECH-', '')
  if (/^CS\d*$/.test(code)) return 'CSE'
  if (/^EC\d*$/.test(code)) return 'ECE'
  if (/^MC\d*$/.test(code)) return 'MCA'
  if (/^MB\d*$/.test(code)) return 'MBA'
  if (code.includes('CSE') || code.includes('COMPUTER')) return 'CSE'
  if (code.includes('ECE') || code.includes('ELECTRONICS')) return 'ECE'
  if (code.includes('AIDS')) return 'AIDS'
  if (code.includes('AI')) return 'AI'
  if (code.includes('MECHANICAL')) return 'ME'
  if (code === 'ME' || code.includes('ME-')) return 'ME'
  if (code.includes('MCA')) return 'MCA'
  if (code.includes('MBA')) return 'MBA'
  return code
}

function normalizedName(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function namesOverlap(left, right) {
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

function facultyDepartmentSort(a, b) {
  const activeCompare = Number(a.active === false) - Number(b.active === false)
  if (activeCompare !== 0) return activeCompare
  const deptA = departmentLabel(a)
  const deptB = departmentLabel(b)
  const deptCompare = deptA.localeCompare(deptB)
  if (deptCompare !== 0) return deptCompare
  return String(a.fullName || '').localeCompare(String(b.fullName || ''))
}

function departmentLabel(row) {
  return row?.department?.name || row?.department?.code || 'Unassigned Department'
}

function numericId(value) {
  return /^\d+$/.test(String(value || '')) ? Number(value) : null
}

function uniqueStrings(values) {
  return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))]
}

function uniqueSortedNumbers(values) {
  return [...new Set((values || []).map(value => Number(value)).filter(Boolean))].sort((a, b) => a - b)
}

function normalizeAcademicYearInput(value) {
  return String(value || '').replace(/[^0-9-]/g, '').slice(0, 7)
}

function isValidAcademicYear(value) {
  return /^20\d{2}-\d{2}$/.test(String(value || '').trim())
}

function Metric({ label, value, tone }) {
  return (
    <div className="stat-card" style={{ '--accent-color': tone, '--accent-bg': `${tone}18` }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function AdminModal({ title, children, onClose }) {
  return (
    <div className="overlay">
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

function Input({ label, value, onChange, type = 'text', inputMode, maxLength }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" type={type} inputMode={inputMode} maxLength={maxLength} value={value} onChange={event => onChange(event.target.value)} />
    </div>
  )
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function ReadOnlyInput({ label, value }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="form-input" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
        {value}
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options, placeholder, disabled = false }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-input" value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  )
}

function MultiSelect({ label, value, onChange, options, emptyText }) {
  return (
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label className="form-label">{label}</label>
      {options.length === 0 ? (
        <div className="form-input" style={{ minHeight: 48, color: 'var(--text-muted)' }}>{emptyText}</div>
      ) : (
        <select
          className="form-input"
          multiple
          value={value}
          onChange={event => onChange(Array.from(event.target.selectedOptions).map(option => option.value))}
          style={{ minHeight: 130 }}
        >
          {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
        </select>
      )}
    </div>
  )
}

function cleanError(err, fallback) {
  const message = err.response?.data?.message || ''
  if (message.toLowerCase().includes('constraint') || message.toLowerCase().includes('could not execute statement')) {
    return 'This faculty record already exists or conflicts with existing ERP data.'
  }
  return message || fallback
}

function isInvalidJsonError(err) {
  const message = `${err?.message || ''} ${err?.response?.data?.message || ''}`.toLowerCase()
  return message.includes('json') || message.includes('unexpected token') || message.includes('parse')
}
