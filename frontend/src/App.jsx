import React, { createContext, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
  if (!response.ok) throw new Error(body.message || 'The magic portal is gathering energy. Please wait a moment and try again.')
  return body
}

function LandingPage() {
  const navigate = useNavigate()
  function enterPortal(portal) {
    navigate('/login', { state: { portal } })
  }

  return <main className="landing-page">
    <div className="landing-stars" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => <span className={`landing-star star-${index + 1}`} key={index} />)}
    </div>
    <div className="landing-rune landing-rune-left" aria-hidden="true">✦</div>
    <div className="landing-rune landing-rune-right" aria-hidden="true">◈</div>
    <section className="landing-content">
      <p className="landing-kicker">A learning adventure for curious minds</p>
      <h1>EduQuest: Where Learning Becomes an Epic Adventure.</h1>
      <p className="landing-description">Turn Math and English practice into a dark fantasy quest, while parents track every brave step along the journey.</p>
      <div className="landing-actions">
        <button className="button button-primary landing-cta" type="button" onClick={() => enterPortal('child')}>Enter Quest (Child)</button>
        <button className="button button-quiet landing-cta" type="button" onClick={() => enterPortal('parent')}>Parent Portal</button>
      </div>
      <div className="landing-trust"><span>5 challenges per quest</span><i /> <span>Math + English</span><i /> <span>CONQUER WITH KNOWLEDGE</span></div>
    </section>
  </main>
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { saveSession } = useAuth()
  const [isRegistering, setIsRegistering] = useState(false)
  const [isChildLogin, setIsChildLogin] = useState(() => location.state?.portal === 'child')
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
    <p className="eyebrow">EduQuest / {isChildLogin ? 'Child Portal' : isRegistering ? 'Parent Registration' : 'Parent Gate'}</p>
    <h1>{isChildLogin ? 'Enter the quest' : isRegistering ? 'Forge your parent account' : 'Parent dashboard'}</h1>
    <p className="lead">{isChildLogin ? 'Unlock the portal, prove your wisdom, and conquer the shadows ahead.' : 'Guide learning journeys, then read the trail they leave behind.'}</p>
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="username">Username</label><input id="username" name="username" value={form.username} onChange={updateField} required />
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" value={form.password} onChange={updateField} minLength="8" required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Opening portal...' : isRegistering ? 'Create parent account' : isChildLogin ? 'Enter quest' : 'Enter dashboard'}</button>
    </form>
    {isChildLogin && <p className="child-helper">No account? Ask your parent to create your hero profile in the <button className="text-button" type="button" onClick={() => { setError(''); setIsChildLogin(false); setIsRegistering(false) }}>Parent Portal</button>!</p>}
    <div className="auth-actions-row">
      {!isChildLogin && <button className="text-button" type="button" onClick={() => { setError(''); setIsRegistering(!isRegistering) }}>{isRegistering ? 'Return to sign in' : 'Create parent account'}</button>}
      <button className="text-button" type="button" onClick={() => { setError(''); setIsChildLogin(!isChildLogin); setIsRegistering(false) }}>{isChildLogin ? 'Parent login' : 'Child login'}</button>
    </div>
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
      {loading ? (
        <div className="quest-loading-container">
          <div className="quest-spinner" />
          <p className="loading-subtitle">The Game Master is weaving your tale... please wait a moment.</p>
        </div>
      ) : (
        <button className="button button-primary" type="submit">Begin quest</button>
      )}
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

  // Fetch dynamic background image
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
      
      if (!response.isCorrect) {
        setFeedback(response.feedback)
        if (response.completed) {
          setQuestState((current) => ({ ...current, pendingCompletion: true }))
        } else {
          setQuestState((current) => ({ ...current, pendingNextQuestion: response.nextQuestion, pendingProgress: response.progress }))
        }
        return
      }

      if (response.completed) {
        setCompleted(true)
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
    if (questState.pendingCompletion) {
      setCompleted(true)
      setFeedback(null)
      return
    }
    setQuestState((current) => ({ ...current, question: current.pendingNextQuestion, progress: current.pendingProgress, pendingNextQuestion: undefined, pendingProgress: undefined }))
    setFeedback(null)
  }

  if (completed) return <main className="quest-scene complete-scene" style={{ backgroundImage: `url(${imageUrl})` }}><section className="story-card"><p className="eyebrow">Victory</p><h1>Quest complete</h1><p style={{ marginBottom: '30px' }}>You answered all five challenges. The realm remembers your courage.</p><button className="button button-primary" type="button" onClick={() => navigate('/quest-setup')}>Begin another quest</button></section></main>

  return <main className="quest-scene" style={{ backgroundImage: `url(${imageUrl})` }}><div className="quest-shade" /><section className="story-card">
    <div className="quest-meta"><span>{questState.quest.subject} / {questState.quest.difficulty}</span><strong>Question {questState.progress.current} of {questState.progress.total}</strong></div>
    <p className="eyebrow">The game master speaks</p><p className="quest-story">{questState.question.story}</p><h1>{questState.question.prompt}</h1>
    {questState.question.type === 'english' ? <div className="answer-options" aria-label="Answer choices">{questState.question.options.map((option) => <button key={option} className={answer === option ? 'answer-option selected' : 'answer-option'} type="button" onClick={() => chooseEnglishAnswer(option)} disabled={loading}>{option}</button>)}<button className="button button-primary" type="button" onClick={submitAnswer} disabled={loading || !answer}>{loading ? 'Consulting the oracle...' : 'Submit answer'}</button></div> : <form className="answer-form" onSubmit={submitAnswer}><label htmlFor="quest-answer">Your answer</label><input id="quest-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="off" disabled={loading} /><button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Consulting the oracle...' : 'Submit answer'}</button></form>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>
  {feedback && <div className="feedback-backdrop"><section className="feedback-dialog" role="dialog" aria-modal="true"><p className="eyebrow">A setback, not a defeat</p><h2>Correct answer: {feedback.correctAnswer}</h2>{questState.quest.subject === 'Math' && <p>{feedback.explanation}</p>}<button className="button button-primary" type="button" onClick={continueAfterFeedback}>Continue</button></section></div>}
  </main>
}

const emptyAnalytics = {
  metrics: { totalQuests: 0, overallAccuracy: 0, favoriteDifficulty: 'None' },
  performanceTrend: [], activityVolume: [], difficultyDistribution: [], history: [],
  hasMore: false, page: 1, totalHistory: 0,
}

function Metric({ label, value }) { return <article className="metric"><span>{label}</span><strong>{value}</strong></article> }

function dateLabel(date) {
  const [, month, day] = date.split('-')
  return `${month}-${day}`
}

function ChartPanel({ title, children, empty }) {
  return <section className="chart-panel"><div className="section-heading"><h2>{title}</h2></div><div className="chart-wrap">{empty ? <p className="empty-state">No completed quests recorded yet.</p> : children}</div></section>
}

function AnalyticsCharts({ analytics }) {
  const tooltipStyle = { background: '#111827', border: '1px solid #475569' }
  const difficultyOrder = { Easy: 0, Medium: 1, Hard: 2 }
  const sortedDifficultyDistribution = [...analytics.difficultyDistribution].sort((left, right) => difficultyOrder[left.name] - difficultyOrder[right.name])
  return <section className="chart-grid advanced-chart-grid">
    <ChartPanel title="Performance - Last Month" empty={!analytics.performanceTrend.some((day) => day.math || day.english)}>
      <ResponsiveContainer width="100%" height="100%"><ComposedChart data={analytics.performanceTrend}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="date" tickFormatter={dateLabel} stroke="#94a3b8" /><YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(value) => `${value}%`} stroke="#94a3b8" /><Tooltip labelFormatter={dateLabel} formatter={(value, name) => [`${value}%`, name]} contentStyle={tooltipStyle} /><Legend /><Bar dataKey="math" name="Math" fill="#e2b659" radius={[4, 4, 0, 0]} /><Line dataKey="english" name="English" stroke="#68b7a6" strokeWidth={3} dot={false} /></ComposedChart></ResponsiveContainer>
    </ChartPanel>
    <ChartPanel title="Activity - Last Week" empty={!analytics.activityVolume.some((day) => day.math || day.english)}>
      <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.activityVolume}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="date" tickFormatter={dateLabel} stroke="#94a3b8" /><YAxis allowDecimals={false} stroke="#94a3b8" /><Tooltip labelFormatter={dateLabel} contentStyle={tooltipStyle} /><Legend /><Bar dataKey="math" name="Math" fill="#e2b659" /><Bar dataKey="english" name="English" fill="#68b7a6" /></BarChart></ResponsiveContainer>
    </ChartPanel>
    <ChartPanel title="Difficulty Distribution" empty={!sortedDifficultyDistribution.some((item) => item.value)}>
      <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sortedDifficultyDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="72%" label><Cell fill="#68b7a6" /><Cell fill="#e2b659" /><Cell fill="#c77d5d" /></Pie><Tooltip contentStyle={tooltipStyle} /><Legend /></PieChart></ResponsiveContainer>
    </ChartPanel>
  </section>
}

function AddHeroModal({ childForm, setChildForm, isCreating, error, onClose, onSubmit }) {
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="hero-modal" role="dialog" aria-modal="true" aria-labelledby="add-hero-title">
      <div className="modal-heading"><div><p className="eyebrow">Party management</p><h2 id="add-hero-title">Add a hero</h2></div><button className="modal-close" type="button" aria-label="Close add hero dialog" onClick={onClose}>×</button></div>
      <form className="auth-form" onSubmit={onSubmit}><label htmlFor="new-child-username">New child username</label><input id="new-child-username" value={childForm.username} onChange={(event) => setChildForm({ ...childForm, username: event.target.value })} required /><label htmlFor="new-child-password">New child password</label><input id="new-child-password" type="password" minLength="8" value={childForm.password} onChange={(event) => setChildForm({ ...childForm, password: event.target.value })} required />{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" type="submit" disabled={isCreating}>{isCreating ? 'Linking...' : 'Create child profile'}</button></form>
    </section>
  </div>
}

function HistoryPanel({ history, hasMore, loading, onLoadMore }) {
  return <section className="history-panel full-width-panel"><div className="section-heading"><p className="eyebrow">Archive</p><h2>Quest history</h2></div><div className="history-list">{history.length ? history.map((quest) => <article className="history-row" key={quest.id}><div><strong>{quest.subject}</strong><span>{quest.completed ? 'Completed' : 'In progress'}</span></div><span className="difficulty-tag">{quest.difficulty}</span><span>{quest.score}/{quest.totalQuestions}</span></article>) : <p className="empty-state">Quest records will appear here.</p>}</div>{hasMore && <button className="button button-quiet load-more" type="button" onClick={onLoadMore} disabled={loading}>{loading ? 'Loading...' : 'Load More...'}</button>}</section>
}

function Dashboard() {
  const { session, clearSession } = useAuth()
  const [children, setChildren] = useState([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [analytics, setAnalytics] = useState(emptyAnalytics)
  const [error, setError] = useState('')
  const [childForm, setChildForm] = useState({ username: '', password: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [isAddHeroOpen, setIsAddHeroOpen] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  useEffect(() => {
    requestJson('/api/auth/children', {}, session.token).then((response) => {
      const nextChildren = response.children || []
      setChildren(nextChildren); setSelectedChildId(nextChildren[0]?.id || '')
    }).catch((loadError) => setError(loadError.message))
  }, [session.token])
  useEffect(() => {
    if (!selectedChildId) { setAnalytics(emptyAnalytics); return }
    setHistoryPage(1)
    requestJson(`/api/quests/analytics/${selectedChildId}?page=1&limit=5`, {}, session.token).then(setAnalytics).catch((loadError) => setError(loadError.message))
  }, [selectedChildId, session.token])
  async function createChild(event) {
    event.preventDefault(); setError(''); setIsCreating(true)
    try {
      const response = await requestJson('/api/auth/create-child', { method: 'POST', body: JSON.stringify(childForm) }, session.token)
      setChildren((currentChildren) => [...currentChildren, response.user]); setSelectedChildId(response.user.id); setChildForm({ username: '', password: '' }); setIsAddHeroOpen(false)
    } catch (createError) { setError(createError.message) } finally { setIsCreating(false) }
  }
  async function loadMoreHistory() {
    if (!selectedChildId || isLoadingMore) return
    const nextPage = historyPage + 1
    setIsLoadingMore(true)
    try {
      const nextAnalytics = await requestJson(`/api/quests/analytics/${selectedChildId}?page=${nextPage}&limit=5`, {}, session.token)
      setAnalytics((current) => ({ ...current, history: [...current.history, ...nextAnalytics.history], hasMore: nextAnalytics.hasMore, totalHistory: nextAnalytics.totalHistory }))
      setHistoryPage(nextPage)
    } catch (loadError) { setError(loadError.message) } finally { setIsLoadingMore(false) }
  }
  const activeChild = children.find((child) => child.id === selectedChildId)
  return <main className="portal-shell dashboard-shell">
    <header className="dashboard-header"><div><p className="eyebrow">EduQuest / Observatory</p><h1>Parent dashboard</h1></div><button className="button button-quiet" type="button" onClick={clearSession}>Sign out</button></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="child-strip" aria-label="Choose a child"><div><p className="eyebrow">Active learner</p><h2>{activeChild?.username || 'No learner linked'}</h2></div><div className="child-tabs">{children.map((child) => <button key={child.id} className={child.id === selectedChildId ? 'child-tab active' : 'child-tab'} type="button" onClick={() => setSelectedChildId(child.id)}>{child.username}</button>)}<button className="button button-primary add-hero-button" type="button" onClick={() => { setError(''); setIsAddHeroOpen(true) }}>+ Add Hero</button></div></section>
    <section className="metric-grid" aria-label="Quest summary"><Metric label="Total quests" value={analytics.metrics.totalQuests} /><Metric label="Overall accuracy" value={`${analytics.metrics.overallAccuracy}%`} /><Metric label="Favorite difficulty" value={analytics.metrics.favoriteDifficulty} /></section>
    <AnalyticsCharts analytics={analytics} />
    <HistoryPanel history={analytics.history} hasMore={analytics.hasMore} loading={isLoadingMore} onLoadMore={loadMoreHistory} />
    {isAddHeroOpen && <AddHeroModal childForm={childForm} setChildForm={setChildForm} isCreating={isCreating} error={error} onClose={() => { setError(''); setIsAddHeroOpen(false) }} onSubmit={createChild} />}
  </main>
}

function App() {
  return <BrowserRouter><AuthProvider><Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/dashboard" element={<ProtectedParentRoute><Dashboard /></ProtectedParentRoute>} /><Route path="/quest-setup" element={<ProtectedChildRoute><QuestSetup /></ProtectedChildRoute>} /><Route path="/quest" element={<ProtectedChildRoute><ActiveQuest /></ProtectedChildRoute>} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes></AuthProvider></BrowserRouter>
}

export default App
