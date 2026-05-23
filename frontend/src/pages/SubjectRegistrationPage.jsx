import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { erpAPI, studentAPI } from '../services/api'

export default function SubjectRegistrationPage() {
  const [profile, setProfile] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [registrationComplete, setRegistrationComplete] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      studentAPI.getProfile(),
      erpAPI.subjects(),
    ])
      .then(([profileResponse, subjectsResponse]) => {
        if (profileResponse.status === 'fulfilled') {
          const student = profileResponse.value.data.data
          const registeredSubjects = parseRegisteredSubjects(student?.registeredSubjects)
          setProfile(student)
          setSelected(registeredSubjects)
          setRegistrationComplete(registeredSubjects.length > 0)
        } else {
          toast.error('Failed to load student profile')
        }

        if (subjectsResponse.status === 'fulfilled') {
          setSubjects(subjectsResponse.value.data.data || [])
        } else {
          setSubjects([])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const availableSubjects = useMemo(() => {
    if (!profile) return []
    return (subjects || []).filter(subject => {
      const semester = subject?.semester?.number || subject?.semester || subject?.semesterNumber
      const subjectCode = normalizedCourseCode(subject?.branch?.code || subject?.branchCode || '')
      const studentCode = normalizedCourseCode(profile.courseCode || '')
      const matchesCourse = Boolean(subjectCode && studentCode && subjectCode === studentCode)
      return matchesCourse && (!semester || Number(semester) === Number(profile.semester))
    })
  }, [profile, subjects])

  const toggleSubject = subjectName => {
    setSelected(prev => prev.includes(subjectName)
      ? prev.filter(item => item !== subjectName)
      : [...prev, subjectName]
    )
  }

  const save = async () => {
    if (!profile?.section) return toast.error('Choose your section before registering subjects')
    if (!profile?.subjectRegistrationAllowed && !profile?.registrationOpen) return toast.error('Subject registration is not open yet')
    if (selected.length === 0) return toast.error('Select at least one subject')
    setSaving(true)
    try {
      const res = await studentAPI.registerSubjects({ subjects: selected })
      setProfile(res.data.data)
      setRegistrationComplete(true)
      toast.success('Subjects registered')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not register subjects')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="card"><div className="empty-state compact">Loading subjects...</div></div>

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Subject Registration</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>Register semester subjects when admin opens access.</p>
        </div>
      </div>

      {registrationComplete ? (
        <section className="card">
          <div className="empty-state compact">
            <strong>Subject registration submitted successfully.</strong>
            <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>
              {selected.length ? `Registered subjects: ${selected.join(', ')}` : 'Your selected subjects have been saved.'}
            </div>
          </div>
        </section>
      ) : !profile?.section ? (
        <section className="card">
          <div className="empty-state compact">Choose your section in My Profile before registering subjects.</div>
        </section>
      ) : !profile?.subjectRegistrationAllowed ? (
        <section className="card">
          <div className="empty-state compact">Subject registration is not open yet.</div>
        </section>
      ) : (
        <section className="card" style={{ padding: 0 }}>
          <div className="table-card-header">
            <div>
              <h3>Semester {profile?.semester} Subjects</h3>
              <p>{selected.length} selected</p>
            </div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Register Subjects'}</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Code</th>
                  <th>Subject</th>
                  <th>Credits</th>
                </tr>
              </thead>
              <tbody>
                {availableSubjects.length === 0 ? (
                  <tr><td colSpan="4">No subjects found for your semester</td></tr>
                ) : availableSubjects.map(subject => (
                  <tr key={subject.id || subject.name}>
                    <td>
                      <input type="checkbox" checked={selected.includes(subject.name)} onChange={() => toggleSubject(subject.name)} />
                    </td>
                    <td>{subject.code || '-'}</td>
                    <td>{subject.name}</td>
                    <td>{subject.credits || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function parseRegisteredSubjects(value) {
  return String(value || '').split('||').map(item => item.trim()).filter(Boolean)
}

function normalizedCourseCode(value) {
  const code = String(value || '').trim().toUpperCase()
  if (code.startsWith('BTECH-')) return code.replace('BTECH-', '')
  if (code.startsWith('BTECH')) return code.replace('BTECH', '').replace(/^\W+/, '')
  return code
}
