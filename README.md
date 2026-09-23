# EduQuest

> **Conquer quests with knowledge.**

EduQuest is a dark-fantasy EdTech platform that turns Math and English practice into epic adventures for children, while providing parents with powerful progress analytics.

## Key Features

- **Epic Educational Quests:** Math and English challenges disguised as immersive adventures.
- **Advanced Parent Analytics:** Interactive dashboard tracking performance trends and engagement.
- **Parent-Led Management:** Secure portal for parents to create and monitor multiple child accounts.
- **Instant Feedback:** Real-time educational corrections without breaking the gaming flow.
- **Dynamic Difficulty:** Easy, Medium, and Hard modes adjusting arithmetic and vocabulary complexity.

## Tech Stack

**Technologies:** 
React, Vite, Tailwind CSS, React Router, Recharts, Node.js, Express, MongoDB (Mongoose), JWT.

**External APIs:** 
Google Gemini API (Narrative generation), Datamuse API (Dictionary definitions), Unsplash API (Dynamic backgrounds).

## AI-Assisted Development Methodology

This project demonstrates AI-assisted software engineering, using an LLM as an autonomous pair-programmer across multiple turns of the spiral. Guided by continuously maintained framing and context documents, the workflow prioritizes the development trail. By enforcing strict verification gates via TDD and maintaining a clean commit history with atomic messages, this process fulfills the course objective of guiding AI to build a reliable, merge-ready architecture.

## Quick Start

### 1. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Variables
The repository includes an `.env.example` file. Duplicate it in your root directory, rename it to `.env`, and fill in your specific credentials.

### 3. Run Locally (Separate Terminals)

**Backend:**
```bash
cd backend && npm run dev
```

**Frontend:**
```bash
cd frontend && npm run dev
```

### 4. Run Tests

```bash
cd backend && npm test
cd ../frontend && npm test
```