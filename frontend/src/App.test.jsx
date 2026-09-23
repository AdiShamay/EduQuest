import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

function setPath(path) {
  window.history.pushState({}, '', path)
}

function jsonResponse(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

describe('EduQuest frontend', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setPath('/login')
    vi.restoreAllMocks()
  })

  it('renders the animated landing page with child and parent entry points', () => {
    setPath('/')
    render(<App />)

    expect(screen.getByRole('heading', { name: /where learning becomes an epic adventure/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enter quest \(child\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /parent portal/i })).toBeInTheDocument()
  })

  it('opens the login page in child mode from the child landing CTA', () => {
    setPath('/')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /enter quest \(child\)/i }))

    expect(window.location.pathname).toBe('/login')
    expect(screen.getByRole('heading', { name: /enter the quest/i })).toBeInTheDocument()
  })

  it('opens the login page in parent mode from the parent landing CTA', () => {
    setPath('/')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /parent portal/i }))

    expect(window.location.pathname).toBe('/login')
    expect(screen.getByRole('heading', { name: /parent dashboard/i })).toBeInTheDocument()
  })

  it('renders login and registration flows and stores the parent session', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      jsonResponse({
        token: 'parent-token',
        user: { id: 'parent-1', username: 'parent-one', role: 'parent' },
      })
    )

    render(<App />)
  expect(screen.getByRole('heading', { name: /parent dashboard/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /create parent account/i }))
    expect(screen.getByRole('heading', { name: /forge your parent account/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /return to sign in/i }))
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'parent-one' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret-password' } })
    fireEvent.click(screen.getByRole('button', { name: /enter dashboard/i }))

    await waitFor(() => expect(screen.getByRole('heading', { name: /parent dashboard/i })).toBeInTheDocument())
    expect(sessionStorage.getItem('eduquest_session')).toContain('parent-token')
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.anything())
  })

  it('protects the dashboard and renders child-scoped analytics, charts, and history', async () => {
    sessionStorage.setItem('eduquest_session', JSON.stringify({
      token: 'parent-token',
      user: { id: 'parent-1', username: 'parent-one', role: 'parent' },
    }))
    setPath('/dashboard')
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(jsonResponse({
        children: [
          { id: 'child-1', username: 'Ari', role: 'child' },
          { id: 'child-2', username: 'Bea', role: 'child' },
        ],
      }))
      .mockReturnValue(jsonResponse({
        metrics: { totalQuests: 4, overallAccuracy: 75, favoriteDifficulty: 'Medium' },
        monthlySuccessByWeek: [{ week: 'Week 1', successful: 2, total: 3 }],
        dailyAccuracy: [{ date: '2026-09-17', accuracy: 75 }],
        history: [{ id: 'quest-1', subject: 'Math', difficulty: 'Medium', score: 4, totalQuestions: 5 }],
      }))

    render(<App />)
    expect(await screen.findByRole('heading', { name: /parent dashboard/i })).toBeInTheDocument()
    expect(await screen.findByText('75%')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /monthly success by week/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /daily accuracy/i })).toBeInTheDocument()
    expect(screen.getAllByText(/medium/i).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /bea/i }))

    await waitFor(() => expect(globalThis.fetch).toHaveBeenLastCalledWith(
      '/api/quests/analytics/child-2',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer parent-token' }) })
    ))
  })

  it('creates a linked child from the dashboard', async () => {
    sessionStorage.setItem('eduquest_session', JSON.stringify({
      token: 'parent-token',
      user: { id: 'parent-1', username: 'parent-one', role: 'parent' },
    }))
    setPath('/dashboard')
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(jsonResponse({ children: [] }))
      .mockReturnValueOnce(jsonResponse({ user: { id: 'child-3', username: 'Nova', role: 'child' } }, 201))

    render(<App />)
    await screen.findByRole('heading', { name: /parent dashboard/i })
    fireEvent.change(screen.getByLabelText(/new child username/i), { target: { value: 'Nova' } })
    fireEvent.change(screen.getByLabelText(/new child password/i), { target: { value: 'child-password' } })
    fireEvent.click(screen.getByRole('button', { name: /create child profile/i }))

    await waitFor(() => expect(screen.getByText(/nova/i)).toBeInTheDocument())
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/auth/create-child', expect.objectContaining({ method: 'POST' }))
  })

  it('logs a child in and routes directly to quest setup', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(jsonResponse({
      token: 'child-token',
      user: { id: 'child-1', username: 'Ari', role: 'child' },
    }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /child login/i }))
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'Ari' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'child-password' } })
    fireEvent.click(screen.getByRole('button', { name: /enter quest/i }))

    expect(await screen.findByRole('heading', { name: /choose your quest/i })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.anything())
  })

  it('starts a quest from setup and renders the active narrative scene', async () => {
    sessionStorage.setItem('eduquest_session', JSON.stringify({
      token: 'child-token', user: { id: 'child-1', username: 'Ari', role: 'child' },
    }))
    setPath('/quest-setup')
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(jsonResponse({
        quest: { id: 'quest-1', subject: 'Math', difficulty: 'Medium' },
        question: { prompt: 'Solve the rune: 5 x 4.', imageKeyword: 'cavern' },
        progress: { current: 1, total: 5 },
      }))
      .mockReturnValueOnce(jsonResponse({ imageUrl: 'https://images.unsplash.com/cavern' }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^math$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^medium$/i }))
    fireEvent.click(screen.getByRole('button', { name: /begin quest/i }))

    expect(await screen.findByText(/solve the rune/i)).toBeInTheDocument()
    expect(screen.getByText(/question 1 of 5/i)).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveStyle({ backgroundImage: 'url(https://images.unsplash.com/cavern)' })
  })

  it('pauses on an incorrect answer, then loads the recovery branch', async () => {
    sessionStorage.setItem('eduquest_session', JSON.stringify({
      token: 'child-token', user: { id: 'child-1', username: 'Ari', role: 'child' },
    }))
    sessionStorage.setItem('eduquest_active_quest', JSON.stringify({
      quest: { id: 'quest-1', subject: 'Math', difficulty: 'Medium' },
      question: { prompt: 'Solve 5 x 4.', imageKeyword: 'gate' },
      progress: { current: 1, total: 5 },
    }))
    setPath('/quest')
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(jsonResponse({ imageUrl: 'https://images.unsplash.com/gate' }))
      .mockReturnValueOnce(jsonResponse({
        isCorrect: false,
        branch: 'setback',
        feedback: { correctAnswer: '20', explanation: 'Five groups of four make twenty.' },
        nextQuestion: { prompt: 'Escape the trap: 3 + 2.', imageKeyword: 'trap' },
        progress: { current: 2, total: 5 },
      }))
      .mockReturnValueOnce(jsonResponse({ imageUrl: 'https://images.unsplash.com/trap' }))

    render(<App />)
    expect(await screen.findByText(/solve 5 x 4/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))

    expect(await screen.findByRole('dialog')).toHaveTextContent(/correct answer: 20/i)
    expect(screen.queryByText(/escape the trap/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(await screen.findByText(/escape the trap/i)).toBeInTheDocument()
    expect(screen.getByText(/question 2 of 5/i)).toBeInTheDocument()
  })

  it('shows completion after the fifth answered question', async () => {
    sessionStorage.setItem('eduquest_session', JSON.stringify({
      token: 'child-token', user: { id: 'child-1', username: 'Ari', role: 'child' },
    }))
    sessionStorage.setItem('eduquest_active_quest', JSON.stringify({
      quest: { id: 'quest-1', subject: 'English', difficulty: 'Easy' },
      question: { prompt: 'Name the key.', imageKeyword: 'tower' },
      progress: { current: 1, total: 5 },
    }))
    setPath('/quest')
    let answerCount = 0
    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(jsonResponse({ imageUrl: 'https://images.unsplash.com/tower' }))
      .mockImplementation((url) => {
        if (!url.includes('/api/quests/answer')) return jsonResponse({})
        answerCount += 1
        return jsonResponse(answerCount === 5
          ? { isCorrect: true, completed: true, progress: { current: 5, total: 5 } }
          : { isCorrect: true, completed: false, nextQuestion: { prompt: `Challenge ${answerCount + 1}`, imageKeyword: 'tower' }, progress: { current: answerCount + 1, total: 5 } })
      })

    render(<App />)
    expect(await screen.findByText(/name the key/i)).toBeInTheDocument()
    for (let index = 0; index < 5; index += 1) {
      fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: 'silver' } })
      fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))
      if (index < 4) await waitFor(() => expect(screen.getByText(`Challenge ${index + 2}`)).toBeInTheDocument())
    }
    expect(await screen.findByText(/quest complete/i)).toBeInTheDocument()
  })

  it('renders exactly four English answer choices instead of a typed input', async () => {
    sessionStorage.setItem('eduquest_session', JSON.stringify({
      token: 'child-token', user: { id: 'child-1', username: 'Ari', role: 'child' },
    }))
    sessionStorage.setItem('eduquest_active_quest', JSON.stringify({
      quest: { id: 'quest-english', subject: 'English', difficulty: 'Easy' },
      question: {
        type: 'english', prompt: 'Choose the definition of brave.', imageKeyword: 'library',
        options: ['A', 'B', 'C', 'D'],
      },
      progress: { current: 1, total: 5 },
    }))
    setPath('/quest')
    vi.spyOn(globalThis, 'fetch').mockReturnValue(jsonResponse({ imageUrl: 'https://images.unsplash.com/library' }))

    render(<App />)
    expect(await screen.findByText(/choose the definition/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^[A-D]$/ })).toHaveLength(4)
    expect(screen.queryByLabelText(/your answer/i)).not.toBeInTheDocument()
  })
})