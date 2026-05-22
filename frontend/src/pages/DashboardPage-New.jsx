import React, { useEffect, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Users, BookOpen, Calendar, FileText, TrendingUp, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data.data)
      setLoading(false)
    } catch (error) {
      toast.error('Failed to load dashboard data')
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading dashboard...</div>

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1>Welcome, {user?.fullName || 'User'}!</h1>
        <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
          {user?.role === 'ADMIN' && 'System Administration Dashboard'}
          {user?.role === 'FACULTY' && 'Faculty Management Dashboard'}
          {user?.role === 'STUDENT' && 'Student Academic Dashboard'}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-4" style={{ marginBottom: '32px' }}>
        {user?.role === 'ADMIN' && (
          <>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Students</p>
                  <h2 style={{ fontSize: '32px', marginBottom: '4px' }}>{stats?.totalStudents || 0}</h2>
                  <p style={{ fontSize: '12px', color: 'var(--success)' }}>✓ Active</p>
                </div>
                <div style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={24} color='var(--success)' />
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Courses</p>
                  <h2 style={{ fontSize: '32px', marginBottom: '4px' }}>{stats?.totalCourses || 0}</h2>
                  <p style={{ fontSize: '12px', color: 'var(--info)' }}>Active programs</p>
                </div>
                <div style={{ width: '48px', height: '48px', background: 'rgba(30, 64, 175, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={24} color='var(--primary)' />
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Users</p>
                  <h2 style={{ fontSize: '32px', marginBottom: '4px' }}>{stats?.totalUsers || 0}</h2>
                  <p style={{ fontSize: '12px', color: 'var(--warning)' }}>System accounts</p>
                </div>
                <div style={{ width: '48px', height: '48px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={24} color='var(--warning)' />
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Avg Attendance</p>
                  <h2 style={{ fontSize: '32px', marginBottom: '4px' }}>{stats?.avgAttendance || 0}%</h2>
                  <p style={{ fontSize: '12px', color: 'var(--accent)' }}>System wide</p>
                </div>
                <div style={{ width: '48px', height: '48px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={24} color='var(--accent)' />
                </div>
              </div>
            </div>
          </>
        )}

        {user?.role === 'STUDENT' && (
          <>
            <div className="card">
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>GPA</p>
              <h2 style={{ fontSize: '32px', marginBottom: '4px' }}>3.85</h2>
              <p style={{ fontSize: '12px', color: 'var(--success)' }}>Excellent</p>
            </div>

            <div className="card">
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Attendance</p>
              <h2 style={{ fontSize: '32px', marginBottom: '4px' }}>92%</h2>
              <p style={{ fontSize: '12px', color: 'var(--success)' }}>Above average</p>
            </div>

            <div className="card">
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Credits Earned</p>
              <h2 style={{ fontSize: '32px', marginBottom: '4px' }}>48</h2>
              <p style={{ fontSize: '12px', color: 'var(--info)' }}>of 120 required</p>
            </div>

            <div className="card">
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Semester</p>
              <h2 style={{ fontSize: '32px', marginBottom: '4px' }}>4</h2>
              <p style={{ fontSize: '12px', color: 'var(--accent)' }}>Current semester</p>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      {stats && (
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Student Distribution by Course</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={stats.studentsByCourse || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {(stats.studentsByCourse || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#1e40af', '#0891b2', '#f59e0b', '#10b981'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.attendanceTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="var(--success)" />
                <Bar dataKey="absent" fill="var(--danger)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
        <div className="grid grid-3">
          {user?.role === 'ADMIN' && (
            <>
              <a href="/students" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Users size={24} color='var(--primary)' />
                  <div>
                    <h4>Manage Students</h4>
                    <p style={{ fontSize: '12px' }}>View and edit student records</p>
                  </div>
                </div>
              </a>

              <a href="/courses" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BookOpen size={24} color='var(--secondary)' />
                  <div>
                    <h4>Manage Courses</h4>
                    <p style={{ fontSize: '12px' }}>Create and manage academic courses</p>
                  </div>
                </div>
              </a>

              <a href="/users" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Users size={24} color='var(--warning)' />
                  <div>
                    <h4>Manage Users</h4>
                    <p style={{ fontSize: '12px' }}>Control user accounts and roles</p>
                  </div>
                </div>
              </a>
            </>
          )}

          {user?.role === 'STUDENT' && (
            <>
              <a href="/my-results" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText size={24} color='var(--primary)' />
                  <div>
                    <h4>My Results</h4>
                    <p style={{ fontSize: '12px' }}>View academic grades</p>
                  </div>
                </div>
              </a>

              <a href="/attendance" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Calendar size={24} color='var(--success)' />
                  <div>
                    <h4>Attendance</h4>
                    <p style={{ fontSize: '12px' }}>Check attendance records</p>
                  </div>
                </div>
              </a>

              <a href="/profile" className="card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Users size={24} color='var(--warning)' />
                  <div>
                    <h4>My Profile</h4>
                    <p style={{ fontSize: '12px' }}>Update profile information</p>
                  </div>
                </div>
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
