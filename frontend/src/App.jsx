import React, { createContext, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './App.css'

const SESSION_KEY = 'eduquest_session'
const AuthContext = createContext(null)

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)
  function saveSession(nextSession) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }
  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }
  return <AuthContext.Provider value={{ session, saveSession, clearSession }}>{children}</AuthContext.Provider>
}

function useAuth() { return useContext(AuthContext) }

async function requestJson(path, options = {}, token) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || 'The magic portal is resting. Try again.')
  return body
}

function LoginPage() {
  const navigate = useNavigate()
  const { saveSession } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  function updateField(event) { setForm({ ...form, [event.target.name]: event.target.value }) }
  async function submit(event) {
    event.preventDefault(); setError(''); setIsSubmitting(true)
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login'
      const body = isRegistering ? { ...form, role: 'parent' } : form
      const response = await requestJson(endpoint, { method: 'POST', body: JSON.stringify(body) })
      saveSession({ token: response.token, user: response.user }); navigate('/dashboard')
    } catch (submitError) { setError(submitError.message) } finally { setIsSubmitting(false) }
  }
  return <main className="portal-shell auth-layout"><section className="auth-panel">
    <p className="eyebrow">EduQuest / Parent Gate</p>
    <h1>{isRegistering ? 'Forge your parent account' : 'Enter the quest'}</h1>
    <p className="lead">Guide learning journeys, then read the trail they leave behind.</p>
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="username">Username</label><input id="username" name="username" value={form.username} onChange={updateField} required />
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" value={form.password} onChange={updateField} minLength="8" required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opening portal...' : isRegistering ? 'Create parent account' : 'Enter dashboard'}</button>
    </form>
    <button className="text-button" type="button" onClick={() => { setError(''); setIsRegistering(!isRegistering) }}>{isRegistering ? 'Return to sign in' : 'Create parent account'}</button>
  </section></main>
}

function ProtectedParentRoute({ children }) {
  const { session } = useAuth()
  return session?.user?.role === 'parent' ? children : <Navigate to="/login" replace />
}

const emptyAnalytics = { metrics: { totalQuests: 0, overallAccuracy: 0, favoriteDifficulty: 'None' }, monthlySuccessByWeek: [], dailyAccuracy: [], history: [] }

function Metric({ label, value }) { return <article className="metric"><span>{label}</span><strong>{value}</strong></article> }

function AnalyticsChart({ title, data, dataKey, categoryKey, color }) {
  return <section className="chart-panel"><div className="section-heading"><p className="eyebrow">Signal</p><h2>{title}</h2></div><div className="chart-wrap">
    {data.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey={categoryKey} stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip contentStyle={{ background: '#111827', border: '1px solid #475569' }} /><Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="empty-state">No completed quests recorded yet.</p>}
  </div></section>
}

function Dashboard() {
  const { session, clearSession } = useAuth()
  const [children, setChildren] = useState([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [analytics, setAnalytics] = useState(emptyAnalytics)
  const [error, setError] = useState('')
  const [childForm, setChildForm] = useState({ username: '', password: '' })
  const [isCreating, setIsCreating] = useState(false)
  useEffect(() => {
    requestJson('/api/auth/children', {}, session.token).then((response) => {
      const nextChildren = response.children || []
      setChildren(nextChildren); setSelectedChildId(nextChildren[0]?.id || '')
    }).catch((loadError) => setError(loadError.message))
  }, [session.token])
  useEffect(() => {
    if (!selectedChildId) { setAnalytics(emptyAnalytics); return }
    requestJson(`/api/quests/analytics/${selectedChildId}`, {}, session.token).then(setAnalytics).catch((loadError) => setError(loadError.message))
  }, [selectedChildId, session.token])
  async function createChild(event) {
    event.preventDefault(); setError(''); setIsCreating(true)
    try {
      const response = await requestJson('/api/auth/create-child', { method: 'POST', body: JSON.stringify(childForm) }, session.token)
      setChildren((currentChildren) => [...currentChildren, response.user]); setChildForm({ username: '', password: '' })
    } catch (createError) { setError(createError.message) } finally { setIsCreating(false) }
  }
  const activeChild = children.find((child) => child.id === selectedChildId)
  return <main className="portal-shell dashboard-shell">
    <header className="dashboard-header"><div><p className="eyebrow">EduQuest / Observatory</p><h1>Parent dashboard</h1></div><button className="button button-quiet" type="button" onClick={clearSession}>Sign out</button></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="child-strip" aria-label="Choose a child"><div><p className="eyebrow">Active learner</p><h2>{activeChild?.username || 'No learner linked'}</h2></div><div className="child-tabs">{children.map((child) => <button key={child.id} className={child.id === selectedChildId ? 'child-tab active' : 'child-tab'} type="button" onClick={() => setSelectedChildId(child.id)}>{child.username}</button>)}</div></section>
    <section className="metric-grid" aria-label="Quest summary"><Metric label="Total quests" value={analytics.metrics.totalQuests} /><Metric label="Overall accuracy" value={`${analytics.metrics.overallAccuracy}%`} /><Metric label="Favorite difficulty" value={analytics.metrics.favoriteDifficulty} /></section>
    <section className="chart-grid"><AnalyticsChart title="Monthly success by week" data={analytics.monthlySuccessByWeek} dataKey="successful" categoryKey="week" color="#e2b659" /><AnalyticsChart title="Daily accuracy" data={analytics.dailyAccuracy} dataKey="accuracy" categoryKey="date" color="#68b7a6" /></section>
    <section className="lower-grid"><section className="history-panel"><div className="section-heading"><p className="eyebrow">Archive</p><h2>Quest history</h2></div><div className="history-list">{analytics.history.length ? analytics.history.map((quest) => <article className="history-row" key={quest.id}><div><strong>{quest.subject}</strong><span>{quest.completed ? 'Completed' : 'In progress'}</span></div><span className="difficulty-tag">{quest.difficulty}</span><span>{quest.score}/{quest.totalQuestions}</span></article>) : <p className="empty-state">Quest records will appear here.</p>}</div></section>
    <section className="child-form-panel"><div className="section-heading"><p className="eyebrow">Party management</p><h2>Link a child</h2></div><form className="auth-form" onSubmit={createChild}><label htmlFor="new-child-username">New child username</label><input id="new-child-username" value={childForm.username} onChange={(event) => setChildForm({ ...childForm, username: event.target.value })} required /><label htmlFor="new-child-password">New child password</label><input id="new-child-password" type="password" minLength="8" value={childForm.password} onChange={(event) => setChildForm({ ...childForm, password: event.target.value })} required /><button className="button button-primary" type="submit" disabled={isCreating}>{isCreating ? 'Linking...' : 'Create child profile'}</button></form></section></section>
  </main>
}

function App() {
  return <BrowserRouter><AuthProvider><Routes><Route path="/login" element={<LoginPage />} /><Route path="/dashboard" element={<ProtectedParentRoute><Dashboard /></ProtectedParentRoute>} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes></AuthProvider></BrowserRouter>
}

export default App
