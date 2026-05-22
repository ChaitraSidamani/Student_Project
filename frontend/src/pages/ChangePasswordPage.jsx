import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const submit = async event => {
    event.preventDefault()
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      return toast.error('Fill all password fields')
    }
    if (form.newPassword.length < 6) return toast.error('New password must be at least 6 characters')
    if (form.newPassword !== form.confirmPassword) return toast.error('New passwords do not match')
    if (form.currentPassword === form.newPassword) return toast.error('Choose a new password')

    setSaving(true)
    try {
      await authAPI.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      toast.success('Password changed. Login again with your new password.')
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <section className="card" style={{ width: '100%', maxWidth: 460 }}>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>Change Password</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 22 }}>
          Set a new password before continuing to the student portal.
        </p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          <PasswordInput label="Current Password" value={form.currentPassword} onChange={value => setForm(prev => ({ ...prev, currentPassword: value }))} />
          <PasswordInput label="New Password" value={form.newPassword} onChange={value => setForm(prev => ({ ...prev, newPassword: value }))} />
          <PasswordInput label="Confirm New Password" value={form.confirmPassword} onChange={value => setForm(prev => ({ ...prev, confirmPassword: value }))} />
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ justifyContent: 'center' }}>
            {saving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </section>
    </div>
  )
}

function PasswordInput({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" type="password" value={value} onChange={event => onChange(event.target.value)} />
    </div>
  )
}
