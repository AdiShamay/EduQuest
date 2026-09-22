# AI Agent Instructions (CLAUDE.md)

## 1. Role & Project Context
You are an expert agentic software engineer collaborating on "EduQuest," an interactive educational platform featuring a branching dark-fantasy narrative game for children and a visual analytics dashboard for parents.

## 2. Tech Stack & Architecture
- **Frontend:** React.js (Vite), Tailwind CSS (styling), React-Router-DOM (routing), Recharts (graphs).
- **Backend:** Node.js with Express.js.
- **Authentication:** Custom JWT (JSON Web Tokens) with bcrypt. Role-based access (`parent` vs `child`).
- **State/Storage:** MongoDB with Mongoose. Schema Architecture: Use an Embedded Documents approach for quests. Maintain 'Users' and 'Quests' collections. Support a one-to-many relationship where a parent can have multiple children. Child user documents MUST contain a 'parentId' reference. Each 'Quest' document MUST contain an embedded array of exactly 5 question objects (including the narrative prompt, the user's answer, the correct answer, and a pass/fail boolean). These 5 objects follow a pre-generated linear story sequence, displaying an educational feedback dialog on incorrect answers before advancing to the next pre-fetched stage.
- **APIs:** Google Gemini API, Unsplash API, Datamuse API.
  - **CRITICAL ARCHITECTURE NOTE:** Google Gemini is responsible only for generating the short narrative wrapper and image keyword. Math and English educational questions are generated locally by the backend. For English quests, the backend fetches a vocabulary word and its meaning from the Datamuse API and constructs the question programmatically.
  
## 2.5 Local Question Generation Engine & Batch Narrative (CRITICAL)
Do NOT use the LLM to generate educational questions. The backend must generate them locally:
- **Math Engine (Typed Input):** Arithmetic logic based on difficulty.
- **English Engine (Multiple Choice with Datamuse API):** Uses local word banks and fetches definitions at runtime via Datamuse API.
- **Batch Narrative Architecture:** To eliminate latency, the Gemini LLM is called exactly ONCE during `startQuest`. It generates a JSON array of 5 narrative segments (Part 1: intro, Parts 2-4: progression, Part 5: conclusion). The backend generates all 5 educational questions instantly, merges them with the 5 narrative segments, and saves them to the DB. The `answerQuest` endpoint requires ZERO API calls and merely validates the answer and advances the array index.

## 3. Mandatory Workflow (Plan First, Code Later)
Your autonomy is strictly limited. Follow this spiral development workflow:
1. **Analyze:** Ask clarifying questions if the intent is ambiguous.
2. **Plan:** Present a step-by-step architectural plan.
3. **Wait:** STOP and wait for my explicit human approval. DO NOT write or generate code until approved.
4. **Execute & Verify:** Follow the testing protocol once approved.

## 4. Verification & Trust (Strict TDD Approach)
Apparent success is not true success.
- **TDD Requirement:** You MUST write failing Jest tests for the requested feature *before* implementing code.
- **Validation:** Execute the tests. Make them pass.
- **Code Comments:** You MUST include detailed explanatory comments using `//` directly above complex business logic lines and key logical blocks. Explain *why* the logic exists, not just what it does.
- **Memory Update:** ONLY after tests pass successfully, update `memory.md` with the completed status. NEVER update `memory.md` if the build is broken.

## 5. Token Economics & LLM Policy (CRITICAL - 100% FREE TIER)
- **Zero-Cost Rule:** Use the configured Gemini API model and keep narrative requests minimal.
- **Extreme Token Conservation:** Prompts must explicitly force Gemini to return JSON only. Narrative text values must not exceed 20-30 words.

## 6. Audit Trail & Git Discipline
- **Atomic Commits:** Prompt me to execute atomic `git commit` actions with honest messages before major changes and after a feature passes verification.
- **Lessons Learned:** Document architectural pitfalls in `lessons-learned.md`.