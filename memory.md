# EduQuest Memory

## Turn 1: Infrastructure & Boilerplate
- Backend initialized with Express and Jest.
- Health endpoint and MongoDB config are in place and passing tests.
- OpenRouter utility scaffolded with a free-tier model configuration and graceful fallback messaging.
- Environment variables documented in .env.example.
- Frontend scaffolding is complete with Vite, React, Tailwind, React Router, and Recharts dependencies.

## Turn 2: Database Schemas & Authentication
- User schema supports parent and child roles, with required parent linkage for children.
- Quest schema embeds exactly five questions and validates subject and difficulty values.
- JWT registration, login, authentication middleware, and parent-only child creation are complete.
- Passwords are hashed with bcrypt and excluded from serialized responses.
- Authentication tests use an isolated in-memory MongoDB instance.

## Status
- Turn 1 and Turn 2: complete and verified.
- Verification: 5 Jest suites passed, 12 tests passed.
- Next milestone: implement quest setup and progression behavior.
