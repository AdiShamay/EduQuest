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

  it('renders login and registration flows and stores the parent session', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      jsonResponse({
        token: 'parent-token',
        user: { id: 'parent-1', username: 'parent-one', role: 'parent' },
      })
    )

    render(<App />)
    expect(screen.getByRole('heading', { name: /enter the quest/i })).toBeInTheDocument()
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
})