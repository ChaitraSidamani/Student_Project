import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ErpWorkspacePage from './pages/ErpWorkspacePage'
import AcademicReportsPage from './pages/AcademicReportsPage'
import AdminControlCenterPage from './pages/AdminControlCenterPage'
import StudentsPage from './pages/StudentsPage'
import FacultyPage from './pages/FacultyPage'
import FacultyProfilePage from './pages/FacultyProfilePage'
import CoursesPage from './pages/CoursesPage'
import AttendancePage from './pages/AttendancePage'
import ResultsPage from './pages/ResultsPage'
import StudentProfilePage from './pages/StudentProfilePage'
import StudentResultsPage from './pages/StudentResultsPage'
import StudentAttendancePage from './pages/StudentAttendancePage'
import SubjectRegistrationPage from './pages/SubjectRegistrationPage'
import NotificationsPage from './pages/NotificationsPage'
import UsersPage from './pages/UsersPage'
import ChangePasswordPage from './pages/ChangePasswordPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spin" style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%' }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'STUDENT' && user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return children
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  return user?.role === 'ADMIN' ? children : <Navigate to="/" replace />
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth()
  return roles.includes(user?.role) ? children : <Navigate to="/" replace />
}

function StudentRoute({ children }) {
  const { user } = useAuth()
  return user?.role === 'STUDENT' ? children : <Navigate to="/" replace />
}

function FacultyRoute({ children }) {
  const { user } = useAuth()
  return user?.role === 'FACULTY' ? children : <Navigate to="/" replace />
}

function HomePage() {
  const { user } = useAuth()
  return user?.role === 'STUDENT' ? <StudentDashboardPage /> : <DashboardPage />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#34d399', secondary: 'var(--bg-card)' } },
            error:   { iconTheme: { primary: '#f87171', secondary: 'var(--bg-card)' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/"           element={<HomePage />} />
                  <Route path="/admin-control" element={<AdminRoute><AdminControlCenterPage /></AdminRoute>} />
                  <Route path="/erp"        element={<RoleRoute roles={['ADMIN', 'FACULTY']}><ErpWorkspacePage /></RoleRoute>} />
                  <Route path="/analytics"  element={<RoleRoute roles={['ADMIN', 'FACULTY']}><AnalyticsPage /></RoleRoute>} />
                  <Route path="/academic-reports" element={<RoleRoute roles={['ADMIN', 'FACULTY']}><AcademicReportsPage /></RoleRoute>} />
                  <Route path="/students"   element={<RoleRoute roles={['ADMIN', 'FACULTY']}><StudentsPage /></RoleRoute>} />
                  <Route path="/faculty"    element={<AdminRoute><FacultyPage /></AdminRoute>} />
                  <Route path="/courses"    element={<RoleRoute roles={['ADMIN', 'FACULTY']}><CoursesPage /></RoleRoute>} />
                  <Route path="/results"    element={<Navigate to="/results/internal" replace />} />
                  <Route path="/results/internal" element={<RoleRoute roles={['ADMIN', 'FACULTY']}><ResultsPage /></RoleRoute>} />
                  <Route path="/results/see" element={<AdminRoute><ResultsPage /></AdminRoute>} />
                  <Route path="/users"      element={<AdminRoute><UsersPage /></AdminRoute>} />
                  <Route path="/attendance" element={<RoleRoute roles={['ADMIN', 'FACULTY']}><AttendancePage /></RoleRoute>} />
                  <Route path="/profile"        element={<StudentRoute><StudentProfilePage /></StudentRoute>} />
                  <Route path="/faculty-profile" element={<FacultyRoute><FacultyProfilePage /></FacultyRoute>} />
                  <Route path="/my-attendance"  element={<StudentRoute><StudentAttendancePage /></StudentRoute>} />
                  <Route path="/subject-registration" element={<StudentRoute><SubjectRegistrationPage /></StudentRoute>} />
                  <Route path="/my-results"     element={<StudentRoute><StudentResultsPage /></StudentRoute>} />
                  <Route path="/notifications" element={<StudentRoute><NotificationsPage /></StudentRoute>} />
                  <Route path="/change-password" element={<StudentRoute><ChangePasswordPage /></StudentRoute>} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
