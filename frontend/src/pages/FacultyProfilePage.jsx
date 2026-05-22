import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Briefcase, CalendarDays, Mail, Phone, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { erpAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function FacultyProfilePage() {
  const { user } = useAuth()
  const [facultyRows, setFacultyRows] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      erpAPI.faculty(),
      erpAPI.assignments(),
    ]).then(([facultyRes, assignmentRes]) => {
      setFacultyRows(dataOrEmpty(facultyRes))
      setAssignments(dataOrEmpty(assignmentRes))
    }).catch(() => {
      toast.error('Failed to load faculty profile')
    }).finally(() => setLoading(false))
  }, [])

  const facultyProfile = useMemo(() => {
    const fromFaculty = (facultyRows || []).find(row => isCurrentFaculty(row, user))
    if (fromFaculty) return fromFaculty
    return (assignments || []).find(row => isCurrentFaculty(row?.faculty, user))?.faculty || null
  }, [assignments, facultyRows, user])

  const myAssignments = useMemo(() => (
    (assignments || []).filter(row => isCurrentFaculty(row?.faculty, user))
  ), [assignments, user])

  const assignedSemesters = uniqueSortedNumbers(myAssignments.map(row => row.semester))
  const assignedYears = uniqueStrings(myAssignments.map(row => row.academicYear))
  const assignedSubjects = uniqueSubjectsFromAssignments(myAssignments)
  const assignedClasses = uniqueClassGroups(myAssignments)

  if (loading) return <div className="loading">Loading faculty profile...</div>

  if (!facultyProfile && myAssignments.length === 0) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h1>My Profile</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Faculty details and assigned classes
            </p>
          </div>
        </div>
        <div className="card">
          <div className="empty-state compact">
            No faculty profile or subject assignment is linked with this login yet.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>My Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Faculty details and assigned classes used in Attendance and Results
          </p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Metric icon={BookOpen} label="Subjects" value={assignedSubjects.length} tone="#1e40af" />
        <Metric icon={Briefcase} label="Class Groups" value={assignedClasses.length} tone="#10b981" />
        <Metric icon={CalendarDays} label="Semesters" value={assignedSemesters.length} tone="#f59e0b" />
        <Metric icon={UserRound} label="Status" value={facultyProfile?.active === false ? 'Inactive' : 'Active'} tone="#0891b2" />
      </div>

      <section className="card" style={{ marginBottom: 20 }}>
        <div className="erp-profile-head">
          <Avatar name={facultyProfile?.fullName || user?.fullName} />
          <div>
            <h3>{facultyProfile?.fullName || user?.fullName || 'Faculty'}</h3>
            <p style={{ margin: 0 }}>
              {facultyProfile?.employeeCode || user?.username || '-'} - {facultyProfile?.designation || 'Faculty Member'}
            </p>
            <span className={`badge ${facultyProfile?.active === false ? 'badge-gray' : 'badge-green'}`}>
              {facultyProfile?.active === false ? 'INACTIVE' : 'ACTIVE'}
            </span>
          </div>
        </div>

        <div className="grid-2">
          <DetailField label="Department" value={departmentLabel(facultyProfile)} />
          <DetailField label="Designation" value={facultyProfile?.designation || 'Faculty Member'} />
          <DetailField label="Username" value={facultyProfile?.username || user?.username || '-'} />
          <DetailField label="Employee Code" value={facultyProfile?.employeeCode || '-'} />
          <DetailField label="Email" value={facultyProfile?.email || user?.email || '-'} icon={Mail} />
          <DetailField label="Phone" value={facultyProfile?.phone || user?.phone || '-'} icon={Phone} />
          <DetailField label="Academic Years" value={assignedYears.join(', ') || '-'} />
          <DetailField label="Assigned Semesters" value={assignedSemesters.map(value => `Semester ${value}`).join(', ') || '-'} />
        </div>
      </section>

      <section className="card" style={{ padding: 0 }}>
        <div className="table-card-header">
          <div>
            <h3>Subject Assignments</h3>
            <p>{myAssignments.length} active assignment{myAssignments.length === 1 ? '' : 's'} linked with this profile</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Branch</th>
                <th>Semester</th>
                <th>Division</th>
                <th>Academic Year</th>
              </tr>
            </thead>
            <tbody>
              {myAssignments.length === 0 ? (
                <tr><td colSpan="5">No active subject assignments found</td></tr>
              ) : myAssignments.map(row => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.subject?.name || row.subjectName || '-'}</strong>
                    <span className="table-subtext">{row.subject?.code || row.subjectCode || ''}</span>
                  </td>
                  <td>{row.branch?.code || row.subject?.branch?.code || '-'}</td>
                  <td>Semester {row.semester || '-'}</td>
                  <td>{row.section || '-'}</td>
                  <td>{row.academicYear || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="stat-card" style={{ '--accent-color': tone, '--accent-bg': `${tone}18` }}>
      <div className="stat-icon"><Icon size={20} /></div>
      <div className="stat-value" style={{ fontSize: typeof value === 'string' ? 22 : 32 }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function DetailField({ label, value, icon: Icon }) {
  return (
    <div className="profile-field">
      <span>{label}</span>
      <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {Icon && <Icon size={15} />}
        {value}
      </strong>
    </div>
  )
}

function Avatar({ name }) {
  const initials = String(name || 'Faculty')
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div style={{
      width: 78,
      height: 78,
      borderRadius: '50%',
      background: 'rgba(30, 64, 175, 0.12)',
      color: 'var(--primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 26,
      fontWeight: 800,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function dataOrEmpty(result) {
  return result.status === 'fulfilled' ? result.value?.data?.data || [] : []
}

function isCurrentFaculty(faculty, user) {
  const row = faculty || {}
  const userId = String(user?.id || '').trim()
  const userEmail = String(user?.email || '').trim().toLowerCase()
  const userName = String(user?.fullName || '').trim().toLowerCase()
  const username = String(user?.username || '').trim().toLowerCase()
  return (
    (userId && String(row.userId || '').trim() === userId) ||
    (userEmail && String(row.email || '').trim().toLowerCase() === userEmail) ||
    (userName && String(row.fullName || '').trim().toLowerCase() === userName) ||
    (username && String(row.username || '').trim().toLowerCase() === username) ||
    (username && String(row.employeeCode || '').trim().toLowerCase() === username)
  )
}

function departmentLabel(row) {
  const department = row?.department || {}
  const code = String(department.code || '').trim()
  const name = String(department.name || '').trim()
  if (code && name) return `${code} - ${name}`
  return name || code || 'Unassigned Department'
}

function uniqueSortedNumbers(values) {
  return [...new Set((values || []).map(value => Number(value)).filter(Boolean))].sort((a, b) => a - b)
}

function uniqueStrings(values) {
  return [...new Set((values || []).map(value => String(value || '').trim()).filter(Boolean))]
}

function uniqueSubjectsFromAssignments(assignments) {
  const rows = new Map()
  ;(assignments || []).forEach(row => {
    const subject = row?.subject || {}
    const key = subject.id || subject.code || subject.name || row.subjectName
    if (!key) return
    rows.set(String(key), subject)
  })
  return [...rows.values()]
}

function uniqueClassGroups(assignments) {
  const rows = new Set()
  ;(assignments || []).forEach(row => {
    rows.add([
      row.branch?.code || row.subject?.branch?.code || '',
      row.semester || '',
      row.section || '',
      row.academicYear || '',
    ].join('|'))
  })
  return [...rows].filter(Boolean)
}
