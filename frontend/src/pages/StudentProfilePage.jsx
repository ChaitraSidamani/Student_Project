import { useEffect, useState } from 'react'
import { studentAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function StudentProfilePage() {
  const [profile, setProfile] = useState(null)
  const [section, setSection] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    studentAPI.getProfile().then(r => {
      setProfile(r.data.data)
      setSection(r.data.data?.section || '')
    })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const updateSection = async () => {
    if (!section) return toast.error('Choose a section')
    setSaving(true)
    try {
      const res = await studentAPI.updateMySection({ section })
      setProfile(res.data.data)
      toast.success('Section updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update section')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Loading profile...</div>
  if (!profile) return <div className="empty-state">Profile not found</div>

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>My Profile</h1>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 940 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: 'white' }}>
            {profile.firstName?.[0]}{profile.lastName?.[0]}
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{profile.fullName}</h2>
            <p style={{ color: 'var(--text-muted)', margin: 4 }}>{profile.rollNumber}</p>
            <span className={`badge ${profile.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{profile.status}</span>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 16 }}>
          {[
            ['Email', profile.email],
            ['Phone', profile.phone || '-'],
            ['Course', `${profile.courseCode || ''} ${profile.courseName || ''}`.trim() || '-'],
            ['Semester', profile.semester ? `Semester ${profile.semester}` : '-'],
            ['Academic Year', profile.academicYear || '-'],
            ['Gender', profile.gender || '-'],
            ['Date of Birth', profile.dateOfBirth || '-'],
            ['Address', profile.address || '-'],
            ['Subject Registration', profile.subjectRegistrationAllowed ? 'Open' : 'Not open'],
            ['Registered Subjects', parseRegisteredSubjects(profile.registeredSubjects).join(', ') || '-'],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>{value}</div>
            </div>
          ))}

          <div className="form-group">
            <label className="form-label">Section</label>
            <select className="form-input" value={section} onChange={event => setSection(event.target.value)}>
              <option value="">Not selected</option>
              {['A', 'B', 'C', 'D'].map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">&nbsp;</label>
            <button className="btn btn-primary" onClick={updateSection} disabled={saving}>{saving ? 'Saving...' : 'Update Section'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseRegisteredSubjects(value) {
  return String(value || '').split('||').map(item => item.trim()).filter(Boolean)
}
