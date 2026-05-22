import { useEffect, useState } from 'react'
import { BookOpen, FileText, GraduationCap, User } from 'lucide-react'
import { attendanceAPI, studentAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      studentAPI.getProfile(),
      attendanceAPI.getMySummary(),
    ])
      .then(([profileResponse, attendanceResponse]) => {
        if (profileResponse.status === 'fulfilled') {
          setProfile(profileResponse.value.data.data)
        } else {
          toast.error('Failed to load student profile')
        }

        if (attendanceResponse.status === 'fulfilled') {
          setAttendance(attendanceResponse.value.data.data || null)
        } else {
          setAttendance(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="card"><div className="empty-state compact">Loading your dashboard...</div></div>
  }

  return (
    <div>
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">Student dashboard</div>
          <h1>Welcome back, {profile?.firstName || user?.fullName?.split(' ')[0] || 'Student'}</h1>
        </div>
        <div className="role-card">
          <GraduationCap size={22} />
          <div>
            <span>Roll number</span>
            <strong>{profile?.rollNumber || user?.username}</strong>
          </div>
        </div>
      </div>

      <div className="grid-3 dashboard-grid">
        <SummaryCard icon={User} label="Course" value={profile?.courseName || 'Not assigned'} />
        <SummaryCard icon={BookOpen} label="Semester" value={profile?.semester ? `Semester ${profile.semester}` : 'Not set'} />
        <SummaryCard icon={FileText} label="Attendance" value={`${attendance?.overallPercentage || 0}%`} />
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="section-title">
          <div>
            <h3>Student Responsibilities</h3>
          </div>
          <BookOpen size={20} />
        </div>
        <div className="grid-3" style={{ gap: 12 }}>
          {[
            'Attend classes regularly',
            'Track internal marks',
            'Keep profile updated',
          ].map(title => (
            <div key={title} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontWeight: 700 }}>{title}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="stat-card" style={{ '--accent-color': '#1e40af', '--accent-bg': 'rgba(30,64,175,0.12)' }}>
      <div className="stat-icon"><Icon size={22} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
