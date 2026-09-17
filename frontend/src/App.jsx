import './App.css'

function App() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">EduQuest</p>
        <h1>Conquer quests with knowledge.</h1>
        <p className="subtitle">
          Your child embarks on a dark-fantasy learning quest while parents track progress,
          difficulty choices, and skill gaps.
        </p>
        <div className="action-row">
          <button type="button" className="primary-button">Enter the Quest</button>
          <button type="button" className="secondary-button">Parent Dashboard</button>
        </div>
      </section>
    </main>
  )
}

export default App
