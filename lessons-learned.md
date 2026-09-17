# EduQuest Lessons Learned

## Turn 4
- Parent analytics required a dedicated parent-authorized read path because the quest router is intentionally restricted to child gameplay operations.
- Dashboard requests must carry the selected child ID and the backend must verify that the child belongs to the authenticated parent before returning any quest data.
- Frontend tests need explicit DOM cleanup between Vitest cases when the test environment does not automatically register Testing Library cleanup.
- The existing frontend build accepts Tailwind v4 at-rules but Lightning CSS reports them as warnings; the bundle also exceeds Vite's default 500 kB warning threshold because Recharts is included in the main bundle.
- JWT responses are stored in sessionStorage for this browser-only flow; production hardening should consider HttpOnly cookies and a CSRF strategy.
