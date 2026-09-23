# EduQuest Lessons Learned

## Turn 4
- Parent analytics required a dedicated parent-authorized read path because the quest router is intentionally restricted to child gameplay operations.
- Dashboard requests must carry the selected child ID and the backend must verify that the child belongs to the authenticated parent before returning any quest data.
- Frontend tests need explicit DOM cleanup between Vitest cases when the test environment does not automatically register Testing Library cleanup.
- The existing frontend build accepts Tailwind v4 at-rules but Lightning CSS reports them as warnings; the bundle also exceeds Vite's default 500 kB warning threshold because Recharts is included in the main bundle.
- JWT responses are stored in sessionStorage for this browser-only flow; production hardening should consider HttpOnly cookies and a CSRF strategy.

## Turn 5
- Keeping Unsplash credentials behind a child-authenticated backend route avoids exposing the access key in the browser and gives the game a stable fallback image path.
- The correction response must be held separately from the active question so incorrect-answer feedback can pause narrative progression before the recovery question replaces it.
- Persisting the active quest snapshot in sessionStorage allows `/quest` to survive navigation while the backend remains authoritative for answer validation and the five-question limit.

## Turn 7
- Keeping Gemini responsible only for narrative metadata prevents educational correctness from depending on model output.
- Gemini's `responseMimeType: application/json` is configured on the generative model and should be paired with application-level validation for story length and allowed fields.
- Provider migrations require updating integration mocks and stale architecture documentation together; otherwise legacy tests can falsely report failures after a correct pivot.

## Turn 13 / Final Polish
- Data visualization: Stacked bar charts can mislead when tracking very small discrete integers; stacking 1 on top of 1 visually reads as 2 on the Y-axis. Grouped bars are safer for low-volume engagement tracking because each subject remains directly comparable.
- Product UX: In a strict Parent-Led Registration EdTech model, children arriving organically at the child gateway need a clear conceptual off-ramp explaining that an adult must provision their account. A visible redirect to the Parent Portal makes that requirement actionable.
- Final balancing changes should preserve the local question-generation boundary: expanding procedural Math ranges improves variety without introducing model-dependent educational correctness or additional API latency.
- Small UI changes should keep focused regression coverage, especially when chart labels, authentication modes, and route-specific copy are part of the user flow.
