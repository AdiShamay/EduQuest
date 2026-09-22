# UI & Architecture Specification

## 1. Visual Identity & Layout
- **Theme:** Dark Mode / Fantasy / Gaming vibe. Deep background colors, glowing button accents, and legible typography suitable for gaming UI.
- **Layout:** The Child Quest view utilizes full-screen dynamic background images with a semi-transparent dark overlay card in the center to ensure text readability.
- **Routing (React-Router-DOM):** `/login`, `/dashboard` (Parents), `/quest-setup` (Subject/Difficulty selection), `/quest` (Active Game).

## 2. The Parent Dashboard (`/dashboard`)
- **Top Metrics:** KPI cards including "Total Quests", "Overall Accuracy", and "Favorite Difficulty Level".
- **Visual Analytics:** A `Recharts` graph showing the child's performance history.
- **Choice Tracking:** A clear log showing exactly which difficulty level (Easy/Medium/Hard) the child chose for each past session.
- **Multi-Child Navigation:** A clear UI element (e.g., tabs or a dropdown menu) at the top of the dashboard allowing the parent to switch the active view between multiple children. All graphs, metrics, and history logs must dynamically update to reflect the currently selected child.
- **Child Management:** A simple section allowing the parent to generate new login credentials (usernames/passwords) for one or more children, securely linking all of them to the parent's master account.

## 3. The Child Quest Flow (`/quest`)
- **Setup Phase:** The child explicitly selects the subject (Math OR English) and the difficulty (Easy, Medium, Hard).
- **The Narrative UI:** 
  - **Background:** Dynamic Unsplash image representing the current scene (e.g., a dark cave, a wizard's tower).
  - **Card Overlay:** A centered, translucent dark card holding the short narrative text (max 30 words).
- **The Challenge UI:** Dynamic input based on the subject. 
  - For **Math** quests: A text/number input field where the child explicitly types their answer.
  - For **English** quests: A multiple-choice interface with exactly 4 buttons (1 correct answer, 3 distractors pulled from the same difficulty word bank).
- **Quest Progression:** A clear progress indicator (e.g., "Question X of 5"). The quest always ends after exactly 5 answered questions. Mistakes trigger an educational correction overlay and log the error. Upon acknowledging the feedback, the game instantly advances to the next scene in the pre-generated 5-part narrative sequence.

## 4. Feedback & Error Handling (Crucial)
- **Explicit Correction:** If the child answers incorrectly, the system MUST pause the narrative and display a clear, educational error message (e.g., "Incorrect! 5 x 4 is 20, not 15.") before generating the next "recovery" branch of the story.
- **API Failures:** If an API times out, display a friendly game-themed message (e.g., "The magic portal is resting, try again!") rather than a raw error code.