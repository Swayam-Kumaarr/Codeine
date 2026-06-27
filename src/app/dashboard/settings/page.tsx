'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { User, Code2, Clock, Trash2, RefreshCw, Check, AlertTriangle, Lock } from 'lucide-react'

export default function SettingsPage() {
  const { profile, reload } = useProfile()
  const router = useRouter()

  const [name, setName] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [leetcodeUsername, setLeetcodeUsername] = useState('')
  const [studyHour, setStudyHour] = useState('09')
  const [studyMin, setStudyMin] = useState('00')
  const [studyAmpm, setStudyAmpm] = useState('AM')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dangerConfirm, setDangerConfirm] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [currentEmail, setCurrentEmail] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setCurrentEmail(user.email)
    })
  }, [])

  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? '')
    setGithubUsername(profile.github_username ?? '')
    setLeetcodeUsername(profile.leetcode_username ?? '')
    if (profile.study_time) {
      const [h24Str, m] = profile.study_time.split(':')
      const h24 = parseInt(h24Str)
      const h12 = h24 % 12 || 12
      setStudyHour(String(h12).padStart(2, '0'))
      setStudyMin(m ?? '00')
      setStudyAmpm(h24 >= 12 ? 'PM' : 'AM')
    }
  }, [profile])

  async function saveProfile() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const h24 = parseInt(studyHour) % 12 + (studyAmpm === 'PM' ? 12 : 0)
    const study_time = `${String(h24).padStart(2, '0')}:${studyMin}`
    const { error } = await supabase.from('profiles').update({
      name,
      github_username: githubUsername || null,
      leetcode_username: leetcodeUsername || null,
      study_time,
    }).eq('id', user.id)
    setSaving(false)
    if (error) { setMsg({ text: error.message, type: 'err' }); return }
    setSaved(true)
    reload()
    setTimeout(() => setSaved(false), 2000)
  }

  async function changeEmail() {
    if (!newEmail.trim() || !newEmail.includes('@')) { setMsg({ text: 'Enter a valid email address.', type: 'err' }); return }
    setEmailSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailSaving(false)
    if (error) { setMsg({ text: error.message, type: 'err' }); return }
    setNewEmail('')
    setMsg({ text: 'Confirmation sent to your new email. Click the link to confirm the change.', type: 'ok' })
    setTimeout(() => setMsg(null), 6000)
  }

  async function changePassword() {
    if (newPassword.length < 8) { setMsg({ text: 'Password must be at least 8 characters.', type: 'err' }); return }
    if (newPassword !== confirmPassword) { setMsg({ text: 'Passwords do not match.', type: 'err' }); return }
    setPwSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) { setMsg({ text: error.message, type: 'err' }); return }
    setNewPassword('')
    setConfirmPassword('')
    setMsg({ text: 'Password updated successfully.', type: 'ok' })
    setTimeout(() => setMsg(null), 3000)
  }

  async function resetStreak(type: 'login' | 'task') {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const col = type === 'login' ? { login_streak: 0 } : { streak: 0 }
    await supabase.from('profiles').update(col).eq('id', user.id)
    reload()
    setDangerConfirm(null)
    setMsg({ text: `${type === 'login' ? 'Login' : 'Task'} streak reset.`, type: 'ok' })
    setTimeout(() => setMsg(null), 3000)
  }

  async function deleteAccount() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('tasks').delete().eq('user_id', user.id)
    await supabase.from('journeys').delete().eq('user_id', user.id)
    await supabase.from('subjects').delete().eq('user_id', user.id)
    await supabase.from('gym_split').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  async function exportData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: p }, { data: t }, { data: j }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('journeys').select('*').eq('user_id', user.id),
      supabase.from('subjects').select('*').eq('user_id', user.id),
    ])
    const blob = new Blob([JSON.stringify({ profile: p, tasks: t, journeys: j, subjects: s }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `codeine-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--line-strong)', borderRadius: 'var(--r)',
    background: 'var(--bg)', color: 'var(--ink)', fontSize: '14px',
    fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-panel)', border: '1px solid var(--line)',
    borderRadius: '8px', padding: '24px', marginBottom: '16px',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--ink-3)', marginBottom: '6px',
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px', color: 'var(--ink)' }}>
        Settings
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--ink-3)', marginBottom: '32px' }}>
        Manage your account and preferences.
      </p>

      {/* Toast */}
      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--r)', marginBottom: '16px',
          background: msg.type === 'ok' ? '#f0fdf4' : '#fff5f5',
          border: `1px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fed7d7'}`,
          color: msg.type === 'ok' ? '#166534' : '#c53030',
          fontSize: '13px',
        }}>
          {msg.text}
        </div>
      )}

      {/* Account section */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <User size={15} color="var(--ink-2)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Account</span>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Display name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>GitHub username</label>
            <input style={inputStyle} value={githubUsername} onChange={e => setGithubUsername(e.target.value)} placeholder="e.g. torvalds" />
          </div>
          <div>
            <label style={labelStyle}><Code2 size={11} style={{ display: 'inline', marginRight: 4 }} />LeetCode username</label>
            <input style={inputStyle} value={leetcodeUsername} onChange={e => setLeetcodeUsername(e.target.value)} placeholder="e.g. neal_wu" />
          </div>
        </div>
        <button
          onClick={saveProfile}
          disabled={saving}
          style={{
            padding: '10px 20px', borderRadius: 'var(--r)', border: 'none',
            background: saved ? '#16a34a' : 'var(--ink)', color: 'var(--bg)',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'background 0.2s',
          }}
        >
          {saved ? <><Check size={13} /> Saved</> : saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Change email section */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <User size={15} color="var(--ink-2)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Email address</span>
        </div>
        {currentEmail && (
          <p style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '12px' }}>
            Current: <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{currentEmail}</span>
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>New email address</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              style={inputStyle}
            />
          </div>
          <button
            onClick={changeEmail}
            disabled={emailSaving || !newEmail.trim()}
            style={{
              padding: '10px 20px', borderRadius: 'var(--r)', border: 'none',
              background: newEmail.trim() ? 'var(--ink)' : 'var(--line-strong)',
              color: newEmail.trim() ? 'var(--bg)' : 'var(--ink-3)',
              fontSize: '13px', fontWeight: 500, cursor: newEmail.trim() ? 'pointer' : 'default',
              fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
            }}
          >
            {emailSaving ? 'Sending…' : 'Update email'}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '8px' }}>
          A confirmation link will be sent to the new address before the change takes effect.
        </p>
      </div>

      {/* Change password section */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Lock size={15} color="var(--ink-2)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Change password</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              style={inputStyle}
            />
          </div>
        </div>
        <button
          onClick={changePassword}
          disabled={pwSaving || !newPassword}
          style={{
            padding: '10px 20px', borderRadius: 'var(--r)', border: 'none',
            background: newPassword ? 'var(--ink)' : 'var(--line-strong)',
            color: newPassword ? 'var(--bg)' : 'var(--ink-3)',
            fontSize: '13px', fontWeight: 500, cursor: newPassword ? 'pointer' : 'default',
            fontFamily: 'var(--font-body)',
          }}
        >
          {pwSaving ? 'Updating…' : 'Update password'}
        </button>
      </div>

      {/* Study time section */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Clock size={15} color="var(--ink-2)" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Study time</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ink-3)', marginBottom: '16px' }}>
          When do you usually start studying? Used for daily digest notifications.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={studyHour} onChange={e => setStudyHour(e.target.value)} style={{ ...inputStyle, width: '70px' }}>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>:</span>
          <select value={studyMin} onChange={e => setStudyMin(e.target.value)} style={{ ...inputStyle, width: '70px' }}>
            {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={studyAmpm} onChange={e => setStudyAmpm(e.target.value)} style={{ ...inputStyle, width: '70px' }}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
          <button
            onClick={saveProfile}
            disabled={saving}
            style={{ padding: '10px 16px', borderRadius: 'var(--r)', border: 'none', background: saved ? '#16a34a' : 'var(--ink)', color: 'var(--bg)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s', marginLeft: '8px' }}
          >
            {saved ? <><Check size={13} /> Saved</> : 'Save'}
          </button>
        </div>
      </div>

      {/* Data export */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '3px' }}>Export my data</p>
            <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Download your profile, tasks, journeys, and subjects as JSON.</p>
          </div>
          <button
            onClick={exportData}
            style={{ padding: '8px 16px', borderRadius: 'var(--r)', border: '1px solid var(--line-strong)', background: 'transparent', color: 'var(--ink)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
          >
            Download ↓
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ ...sectionStyle, border: '1px solid #fed7d7', background: '#fff5f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <AlertTriangle size={15} color="#c53030" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#c53030' }}>Danger zone</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Reset login streak */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'white', borderRadius: 'var(--r)', border: '1px solid #fed7d7' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>Reset login streak</p>
              <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Currently {profile?.login_streak ?? 0} days</p>
            </div>
            {dangerConfirm === 'login_streak' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => resetStreak('login')} style={{ padding: '6px 12px', borderRadius: 'var(--r)', border: 'none', background: '#c53030', color: 'white', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Confirm</button>
                <button onClick={() => setDangerConfirm(null)} style={{ padding: '6px 12px', borderRadius: 'var(--r)', border: '1px solid var(--line-strong)', background: 'white', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setDangerConfirm('login_streak')} style={{ padding: '6px 12px', borderRadius: 'var(--r)', border: '1px solid #fed7d7', background: 'transparent', color: '#c53030', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={11} /> Reset
              </button>
            )}
          </div>

          {/* Reset task streak */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'white', borderRadius: 'var(--r)', border: '1px solid #fed7d7' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>Reset task streak</p>
              <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Currently {profile?.streak ?? 0} days</p>
            </div>
            {dangerConfirm === 'task_streak' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => resetStreak('task')} style={{ padding: '6px 12px', borderRadius: 'var(--r)', border: 'none', background: '#c53030', color: 'white', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Confirm</button>
                <button onClick={() => setDangerConfirm(null)} style={{ padding: '6px 12px', borderRadius: 'var(--r)', border: '1px solid var(--line-strong)', background: 'white', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setDangerConfirm('task_streak')} style={{ padding: '6px 12px', borderRadius: 'var(--r)', border: '1px solid #fed7d7', background: 'transparent', color: '#c53030', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={11} /> Reset
              </button>
            )}
          </div>

          {/* Delete account */}
          <div style={{ padding: '12px', background: 'white', borderRadius: 'var(--r)', border: '1px solid #fed7d7' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: dangerConfirm === 'delete_account' ? '12px' : '0' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#c53030' }}>Delete account</p>
                <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Permanently remove all data. Cannot be undone.</p>
              </div>
              {dangerConfirm !== 'delete_account' && (
                <button onClick={() => { setDangerConfirm('delete_account'); setDeleteConfirmText('') }} style={{ padding: '6px 12px', borderRadius: 'var(--r)', border: '1px solid #fed7d7', background: 'transparent', color: '#c53030', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Trash2 size={11} /> Delete
                </button>
              )}
            </div>
            {dangerConfirm === 'delete_account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '12px', color: '#c53030' }}>Type <strong>DELETE</strong> to confirm:</p>
                <input
                  autoFocus
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  style={{ padding: '8px 10px', border: '1px solid #fed7d7', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none', color: 'var(--ink)' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={deleteAccount}
                    disabled={deleteConfirmText !== 'DELETE'}
                    style={{ padding: '6px 12px', borderRadius: 'var(--r)', border: 'none', background: deleteConfirmText === 'DELETE' ? '#c53030' : '#e0a0a0', color: 'white', fontSize: '12px', cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}
                  >
                    Delete everything
                  </button>
                  <button onClick={() => { setDangerConfirm(null); setDeleteConfirmText('') }} style={{ padding: '6px 12px', borderRadius: 'var(--r)', border: '1px solid var(--line-strong)', background: 'white', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* App info */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <p style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Codeine · v0.1 · Level {profile?.level ?? 1} · {profile?.xp ?? 0} XP total</p>
      </div>
    </div>
  )
}
