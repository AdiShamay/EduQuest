# UI & Architecture Specification

## 1. Visual Identity & Layout
- **Theme:** Dark Mode / Fantasy / Gaming vibe. Deep background colors, glowing button accents, and legible typography suitable for gaming UI.
- **Layout:** The Child Quest view utilizes full-screen dynamic background images with a semi-transparent dark overlay card in the center to ensure text readability.
- **Routing (React-Router-DOM):** `/` (Landing Page), `/login` (Auth Portal), `/dashboard` (Parents), `/quest-setup` (Setup), `/quest` (Active Game).
- **Landing Page (`/`):** A high-impact, animated introduction to EduQuest. Must feature a dark fantasy aesthetic, CSS-based ambient animations (e.g., glowing text, floating particles, or slow-pulsing elements), and a clear value proposition explaining the dual-nature of the app (Math/English adventure for kids + Analytics for parents). Includes two distinct CTA buttons leading to the respective login states.
- **Routing & Gateways:** The platform features distinct entry gates: a Parent Portal (/login with parent registration/login toggles) designed for observatory monitoring, and dedicated authentication states ensuring clear visual separation between adult management and child quest access.

## 2. The Parent Dashboard (`/dashboard`)
- **Top Metrics:** KPI cards including "Total Quests", "Overall Accuracy", and "Favorite Difficulty Level".
- **Multi-Child Navigation & Management:** A clear tabbed UI at the top for switching between active children. Next to these tabs, an explicitly styled "+ Add Hero" button opens a modal/pop-up window for generating new child credentials. This removes the registration form from the main dashboard body to save screen space. All dashboard data must dynamically update based on the selected tab.
- **Visual Analytics (Recharts):** The dashboard must render 3 distinct charts with realistic timeframes:
  1. **Performance Trend (Last 30 Days):** A Composed Chart showing daily average scores plotted by distinct dates (e.g., "09-20", "09-21"). It must visually separate subjects (e.g., rendering Math as bars and English as a continuous line) to easily spot knowledge gaps.
  2. **Activity Volume (Last 7 Days):** A Stacked Bar Chart showing the total number of quests completed per day, stacked or grouped by subject (Math vs. English) to highlight recent engagement.
  3. **Difficulty Distribution (All-Time):** A Pie Chart presenting the percentage breakdown of chosen difficulty levels (Easy/Medium/Hard) across the child's entire history.
- **Quest History:** A full-width list at the bottom showing quest details (subject, difficulty, score). To maintain a clean UI, this list must render a maximum of 5 recent quests initially, with a clear "Load More..." button beneath it to expand older history on demand.

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
- **API Failures:** If an API times out, display a friendly game-themed message (e.g., "The magic portal is gathering energy. Please wait a moment and try again.") rather than a raw error code.