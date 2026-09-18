# EduQuest Memory

## Turn 1: Infrastructure & Boilerplate
- Backend initialized with Express and Jest.
- Health endpoint and MongoDB config are in place and passing tests.
- OpenRouter utility enforces an explicit :free model, uses compact JSON prompt constraints, and provides graceful fallback messaging.
- Environment variables documented in .env.example.
- Frontend scaffolding is complete with Vite, React, Tailwind, React Router, and Recharts dependencies.

## Turn 2: Database Schemas & Authentication
- User schema supports parent and child roles, with required parent linkage for children.
- Quest schema embeds exactly five questions and validates subject and difficulty values.
- JWT registration, login, authentication middleware, and parent-only child creation are complete.
- Passwords are hashed with bcrypt and excluded from serialized responses.
- Authentication tests use an isolated in-memory MongoDB instance.

## Turn 3: Core Quest Engine
- Child-only quest initialization supports Math or English and Easy, Medium, or Hard difficulty.
- Quest progression enforces exactly five questions and rejects answers after completion.
- Correct answers use normal progression; incorrect answers return the correction and branch into setback/recovery content.
- OpenRouter responses are parsed as compact JSON with a maximum 30-word story and one image keyword.
- Quest tests cover initialization, authorization, branching, progression, completion, and clean MongoDB teardown.

## Status
- Turn 1, Turn 2, and Turn 3: complete and verified.
- Verification: quest suite passed with 5 tests; full backend suite previously passed with 13 tests; frontend production build passed.
- Turn 4: complete and verified.
- Parent dashboard now includes JWT login/registration, protected routing, linked-child tabs, child creation, KPI metrics, Recharts success/accuracy charts, and difficulty-aware quest history.
- Parent dashboard API supports parent-scoped child listing and child-scoped analytics/history queries.
- Verification: frontend Vitest passed 3 tests; frontend production build passed; frontend lint passed with one non-blocking React effect warning; full backend Jest passed 21 tests across 7 suites.
- Known non-blocking build warnings: Tailwind at-rules reported by Lightning CSS and a Vite bundle-size warning.
- Turn 5: complete and verified.
- Child login now routes directly to quest setup; quest setup supports Math/English and Easy/Medium/Hard selections.
- Active child gameplay renders keyword-based Unsplash scenes, five-question progress, answer submission, completion, and an educational correction overlay before setback/recovery questions.
- Backend provides a child-authenticated Unsplash proxy with a friendly fallback image and keeps the access key server-side.
- Verification: frontend Vitest passed 7 tests; frontend production build passed; frontend lint passed with one non-blocking React effect warning; full backend Jest passed 23 tests across 8 suites.
- Next milestone: perform the final manual child login, quest setup, correct-answer, incorrect-answer, recovery, and completion workflow check.

## Turn 6: Architecture Refactor (Quest Engine Pivot)
- Strategic pivot: Removed LLM dependency for question generation to eliminate parsing errors and 429 rate-limit bottlenecks.
- Backend is now strictly responsible for generating Math questions (dynamic arithmetic logic based on difficulty) and English questions.
- English questions are constructed programmatically by selecting a word from local difficulty banks and making a live API call to the Free Dictionary API to fetch definitions/synonyms.
- English questions implement a 4-option multiple-choice format; Math questions implement a direct typed input field.
- OpenRouter LLM is now strictly limited to generating the narrative wrapper (30 words max) and a single image keyword per turn.
