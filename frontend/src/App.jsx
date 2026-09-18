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
  const [isChildLogin, setIsChildLogin] = useState(false)
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
      saveSession({ token: response.token, user: response.user }); navigate(response.user.role === 'child' ? '/quest-setup' : '/dashboard')
    } catch (submitError) { setError(submitError.message) } finally { setIsSubmitting(false) }
  }
  return <main className="portal-shell auth-layout"><section className="auth-panel">
    <p className="eyebrow">EduQuest / {isChildLogin ? 'Child Gate' : 'Parent Gate'}</p>
    <h1>{isRegistering ? 'Forge your parent account' : 'Enter the quest'}</h1>
    <p className="lead">Guide learning journeys, then read the trail they leave behind.</p>
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="username">Username</label><input id="username" name="username" value={form.username} onChange={updateField} required />
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" value={form.password} onChange={updateField} minLength="8" required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opening portal...' : isRegistering ? 'Create parent account' : isChildLogin ? 'Enter quest' : 'Enter dashboard'}</button>
    </form>
    {!isChildLogin && <button className="text-button" type="button" onClick={() => { setError(''); setIsRegistering(!isRegistering) }}>{isRegistering ? 'Return to sign in' : 'Create parent account'}</button>}
    {!isRegistering && <button className="text-button" type="button" onClick={() => { setError(''); setIsChildLogin(!isChildLogin) }}>{isChildLogin ? 'Parent login' : 'Child login'}</button>}
  </section></main>
}

function ProtectedParentRoute({ children }) {
  const { session } = useAuth()
  return session?.user?.role === 'parent' ? children : <Navigate to="/login" replace />
}

function ProtectedChildRoute({ children }) {
  const { session } = useAuth()
  return session?.user?.role === 'child' ? children : <Navigate to="/login" replace />
}

function QuestSetup() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function start(event) {
    event.preventDefault()
    if (!subject || !difficulty) {
      setError('Choose a subject and difficulty before entering the realm.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await requestJson('/api/quests/start', {
        method: 'POST',
        body: JSON.stringify({ subject, difficulty }),
      }, session.token)
      sessionStorage.setItem('eduquest_active_quest', JSON.stringify({
        quest: response.quest,
        question: response.question,
        progress: response.progress,
      }))
      navigate('/quest')
    } catch (startError) {
      setError(startError.message)
    } finally {
      setLoading(false)
    }
  }

  return <main className="portal-shell setup-shell"><section className="setup-panel">
    <p className="eyebrow">EduQuest / The Crossroads</p>
    <h1>Choose your quest</h1>
    <p className="lead">Pick a path. The game master will shape five challenges around it.</p>
    <form className="quest-form" onSubmit={start}>
      <fieldset><legend>Subject</legend><div className="choice-grid">{['Math', 'English'].map((option) => <button key={option} className={subject === option ? 'choice active' : 'choice'} type="button" onClick={() => setSubject(option)}>{option}</button>)}</div></fieldset>
      <fieldset><legend>Difficulty</legend><div className="choice-grid">{['Easy', 'Medium', 'Hard'].map((option) => <button key={option} className={difficulty === option ? 'choice active' : 'choice'} type="button" onClick={() => setDifficulty(option)}>{option}</button>)}</div></fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Opening the gate...' : 'Begin quest'}</button>
    </form>
  </section></main>
}

function ActiveQuest() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const savedQuest = JSON.parse(sessionStorage.getItem('eduquest_active_quest') || 'null')
  const [questState, setQuestState] = useState(savedQuest)
  const [imageUrl, setImageUrl] = useState('')
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!questState?.question?.imageKeyword) return
    requestJson(`/api/images/${encodeURIComponent(questState.question.imageKeyword)}`, {}, session.token)
      .then((response) => setImageUrl(response.imageUrl))
      .catch(() => setImageUrl('https://images.unsplash.com/photo-1518709268805-4e9042?auto=format&fit=crop&w=2000&q=80'))
  }, [questState?.question?.imageKeyword, session.token])

  if (!questState) return <Navigate to="/quest-setup" replace />

  async function submitAnswer(event) {
    event.preventDefault()
    if (!answer.trim() || loading || completed) return
    setLoading(true)
    setError('')
    try {
      const response = await requestJson('/api/quests/answer', {
        method: 'POST',
        body: JSON.stringify({ questId: questState.quest.id, answer }),
      }, session.token)
      setAnswer('')
      if (response.completed) {
        setCompleted(true)
        return
      }
      if (!response.isCorrect) {
        setFeedback(response.feedback)
        setQuestState((current) => ({ ...current, pendingNextQuestion: response.nextQuestion, pendingProgress: response.progress }))
        return
      }
      setQuestState((current) => ({ ...current, question: response.nextQuestion, progress: response.progress }))
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  function chooseEnglishAnswer(option) {
    setAnswer(option)
  }

  function continueAfterFeedback() {
    setQuestState((current) => ({ ...current, question: current.pendingNextQuestion, progress: current.pendingProgress, pendingNextQuestion: undefined, pendingProgress: undefined }))
    setFeedback(null)
  }

  if (completed) return <main className="quest-scene complete-scene" style={{ backgroundImage: `url(${imageUrl})` }}><section className="story-card"><p className="eyebrow">Victory</p><h1>Quest complete</h1><p>You answered all five challenges. The realm remembers your courage.</p><button className="button button-primary" type="button" onClick={() => navigate('/quest-setup')}>Begin another quest</button></section></main>

  return <main className="quest-scene" style={{ backgroundImage: `url(${imageUrl})` }}><div className="quest-shade" /><section className="story-card">
    <div className="quest-meta"><span>{questState.quest.subject} / {questState.quest.difficulty}</span><strong>Question {questState.progress.current} of {questState.progress.total}</strong></div>
    <p className="eyebrow">The game master speaks</p><p className="quest-story">{questState.question.story}</p><h1>{questState.question.prompt}</h1>
    {questState.question.type === 'english' ? <div className="answer-options" aria-label="Answer choices">{questState.question.options.map((option) => <button key={option} className={answer === option ? 'answer-option selected' : 'answer-option'} type="button" onClick={() => chooseEnglishAnswer(option)} disabled={loading}>{option}</button>)}<button className="button button-primary" type="button" onClick={submitAnswer} disabled={loading || !answer}>{loading ? 'Consulting the oracle...' : 'Submit answer'}</button></div> : <form className="answer-form" onSubmit={submitAnswer}><label htmlFor="quest-answer">Your answer</label><input id="quest-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="off" disabled={loading} /><button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Consulting the oracle...' : 'Submit answer'}</button></form>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>
  {feedback && <div className="feedback-backdrop"><section className="feedback-dialog" role="dialog" aria-modal="true"><p className="eyebrow">A setback, not a defeat</p><h2>Correct answer: {feedback.correctAnswer}</h2><p>{feedback.explanation}</p><button className="button button-primary" type="button" onClick={continueAfterFeedback}>Continue</button></section></div>}
  </main>
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
  return <BrowserRouter><AuthProvider><Routes><Route path="/login" element={<LoginPage />} /><Route path="/dashboard" element={<ProtectedParentRoute><Dashboard /></ProtectedParentRoute>} /><Route path="/quest-setup" element={<ProtectedChildRoute><QuestSetup /></ProtectedChildRoute>} /><Route path="/quest" element={<ProtectedChildRoute><ActiveQuest /></ProtectedChildRoute>} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes></AuthProvider></BrowserRouter>
}

export default App
