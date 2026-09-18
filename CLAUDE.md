# AI Agent Instructions (CLAUDE.md)

## 1. Role & Project Context
You are an expert agentic software engineer collaborating on "EduQuest," an interactive educational platform featuring a branching dark-fantasy narrative game for children and a visual analytics dashboard for parents.

## 2. Tech Stack & Architecture
- **Frontend:** React.js (Vite), Tailwind CSS (styling), React-Router-DOM (routing), Recharts (graphs).
- **Backend:** Node.js with Express.js.
- **Authentication:** Custom JWT (JSON Web Tokens) with bcrypt. Role-based access (`parent` vs `child`).
- **State/Storage:** MongoDB with Mongoose. Schema Architecture: Use an Embedded Documents approach for quests. Maintain 'Users' and 'Quests' collections. Support a one-to-many relationship where a parent can have multiple children. Child user documents MUST contain a 'parentId' reference. Each 'Quest' document MUST contain an embedded array of exactly 5 question objects (including the narrative prompt, the user's answer, the correct answer, and a pass/fail boolean). These 5 objects seamlessly include both standard progression and branched "recovery" questions.
- **APIs:** OpenRouter API, Unsplash API, Free Dictionary API. 
  - **CRITICAL ARCHITECTURE NOTE:** The OpenRouter LLM is responsible for generating ALL challenges (both Math equations and English questions) as part of the narrative. For English quests, the backend fetches a vocabulary word and its meaning from the Free Dictionary API, which is then fed to the LLM so it can generate the specific narrative question around that word.
  
## 2.5 Local Question Generation Engine (CRITICAL)
Do NOT use the LLM to generate educational questions. The backend must generate them locally:
- **Math Engine (Typed Input):**
  - **Easy:** Addition and subtraction with numbers from 1 to 20.
  - **Medium:** Addition and subtraction up to 100. Multiplication up to 10 (times tables).
  - **Hard:** Addition and subtraction up to 1000. Multiplication up to 10. Division without remainder (e.g., 56 / 7).
- **English Engine (Multiple Choice with Free Dictionary API):**
  - Create 3 static arrays (Word Banks) in the backend containing only the target English words for Easy, Medium, and Hard.
  - At runtime, the backend randomly selects a word from the appropriate difficulty bank and makes a live HTTP request to the Free Dictionary API.
  - The backend extracts the definition, synonym, or example sentence from the API response and programmatically constructs a question string (e.g., "What is the definition of X?") along with 4 multiple-choice options (1 correct, 3 random distractors from the word bank).

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
- **Zero-Cost Rule:** ALWAYS use models labeled with the `:free` tag on OpenRouter (e.g., Llama 3 or Gemma).
- **Extreme Token Conservation:** Prompts must explicitly force the LLM to return MINIFIED JSON only. Narrative text values must not exceed 20-30 words. Conserve tokens relentlessly to avoid free-tier rate limits.

## 6. Audit Trail & Git Discipline
- **Atomic Commits:** Prompt me to execute atomic `git commit` actions with honest messages before major changes and after a feature passes verification.
- **Lessons Learned:** Document architectural pitfalls in `lessons-learned.md`.