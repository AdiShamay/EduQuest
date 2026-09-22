# FRAMING DOCUMENT: EduQuest
**Tagline:** Conquer quests with knowledge.

## 1. Problem Statement
Traditional educational tools often fail to sustain children's engagement in core subjects like Math and English. Conversely, parents lack accessible insights into their child's specific academic friction points and the difficulty levels they choose to tackle. EduQuest solves this by disguising learning as an interactive, dark-fantasy narrative game for the child, while providing a data-rich, analytical dashboard for the parent.

## 2. Core Concept & Mechanics
- **For the Child (The Quest):** A dynamic, gaming-inspired dark fantasy UI. The child chooses a subject (Math OR English) and a difficulty level (Easy/Medium/Hard) before starting. Every quest consists of exactly 5 questions, regardless of the narrative path.
- **The Narrative Loop:** To advance the story, the child must solve a challenge. 
  - **Success:** The story progresses instantly to the next pre-generated scene.
  - **Failure:** The system explicitly notifies the child of the error and explains the correct answer via a feedback overlay. Once acknowledged, the narrative progresses instantly to the next pre-generated scene in the sequence.
- **For the Parent (The Dashboard):** A visual analytics board tracking success rates, time spent, weak areas, and specifically tracking which difficulty levels the child is voluntarily choosing.
- **Strict LLM Constraints & Batch Generation:** To ensure instantaneous gameplay and 100% free usage, the LLM generates the entire narrative upfront. At the start of a quest, Gemini is called ONCE to return a JSON array of 5 short story segments (max 30 words each) and image keywords. All Math and English questions are generated instantly and locally by the backend. During gameplay, answering questions is instantaneous as it merely iterates through the pre-generated sequence without any additional API calls.
- **External APIs:** Unsplash API (for dynamic background images), Google Gemini API (for narrative only), and Free Dictionary API (for live English definitions/synonyms).

## 3. Testable Definition of Done (DoD)
The project is ready for submission when:
1. **Authentication & Linkage:** Users log in via custom JWT. A parent account must be able to create and link multiple child profiles from their dashboard. The system must ensure that the parent's dashboard can toggle between children via tabs, and exclusively queries quest data tied to the currently selected child's ID.
2. **Parent Dashboard:** Renders at least one analytical graph displaying the child's performance and logs the difficulty levels chosen by the child.
3. **Child Quest:** The child can select a subject and difficulty. The UI renders a full-screen Unsplash background with a semi-transparent text card overlay.
4. **Educational Feedback:** On an incorrect answer, the system displays the correct answer with a brief explanation before seamlessly advancing to the next pre-generated narrative segment.
5. **Development Trail:** The commit history demonstrates atomic commits, clear verification gates (TDD), and at least 3 full turns of the spiral.

## 4. Out of Scope (What we are NOT building)
- Heavy LLM text generation (no long stories, to strictly conserve free tokens).
- Mixed-subject quests (Math and English remain separate game modes).
- Real-money payments or subscriptions.
- 3D graphics or real-time animations.