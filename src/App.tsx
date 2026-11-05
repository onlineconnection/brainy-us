import { useState } from 'react'
import './index.css'

const modes = [
  { icon: '⚡', name: 'First to Answer', description: 'Be the fastest. Claim the points.', tag: 'QUICK BATTLE' },
  { icon: '👑', name: 'Battle Royale', description: 'Outlast everyone. Become champion.', tag: '100 PLAYERS' },
  { icon: '🤝', name: 'Play with Friends', description: 'Create a room and challenge friends.', tag: 'PRIVATE ROOM' },
]

const players = [
  { rank: 1, name: 'ShadowX', points: '12,850', avatar: '👑' },
  { rank: 2, name: 'NovaKing', points: '11,420', avatar: '🦊' },
  { rank: 3, name: 'BrainStorm', points: '10,960', avatar: '🧠' },
]

function App() {
  const [activeTab, setActiveTab] = useState('Home')

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-mark">B</span>
          <span>Brainy <b>US</b></span>
        </a>

        <div className="side-label">MENU</div>
        {['Home', 'Discover', 'Leaderboard', 'Tournaments', 'Profile'].map(item => (
          <button
            key={item}
            className={`nav-item ${activeTab === item ? 'active' : ''}`}
            onClick={() => setActiveTab(item)}
          >
            <span>{{
              Home: '⌂',
              Discover: '◈',
              Leaderboard: '♜',
              Tournaments: '🏆',
              Profile: '◉',
            }[item]}</span>
            {item}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="online-dot" />
          <span>All systems operational</span>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="mobile-brand">BRAINY <b>US</b></div>
          <div className="breadcrumb">Platform <span>/</span> {activeTab}</div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">♧</button>
            <div className="profile-chip">
              <span className="avatar">🎮</span>
              <span>Guest Player</span>
            </div>
          </div>
        </header>

        {activeTab === 'Home' ? (
          <>
            <section className="welcome">
              <div>
                <div className="eyebrow"><span /> THE BATTLE STARTS HERE</div>
                <h1>Think fast.<br /><span>Play smarter.</span></h1>
                <p>Challenge your mind, compete with players worldwide, and rise to the top.</p>
                <button className="primary-button" onClick={() => setActiveTab('Discover')}>
                  Explore battles <span>↗</span>
                </button>
              </div>
              <div className="hero-art">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="hero-symbol">B<span>!</span></div>
                <div className="floating-card card-top">⚡ FASTEST WINS</div>
                <div className="floating-card card-bottom">🏆 YOUR NEXT VICTORY</div>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">⚔️</span>
                <span className="stat-label">BATTLES PLAYED</span>
                <strong>0</strong>
                <small>Your journey starts now</small>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🏆</span>
                <span className="stat-label">VICTORIES</span>
                <strong>0</strong>
                <small>Make your first win count</small>
              </div>
              <div className="stat-card">
                <span className="stat-icon">⭐</span>
                <span className="stat-label">TOTAL POINTS</span>
                <strong>0</strong>
                <small>Earn points by competing</small>
              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">CHOOSE YOUR CHALLENGE</span>
                  <h2>Enter the arena</h2>
                </div>
                <button className="text-button" onClick={() => setActiveTab('Discover')}>View all ↗</button>
              </div>
              <div className="modes-grid">
                {modes.map((mode, index) => (
                  <button className={`mode-card mode-${index}`} key={mode.name}
                    onClick={() => setActiveTab('Discover')}>
                    <span className="mode-icon">{mode.icon}</span>
                    <span className="mode-tag">{mode.tag}</span>
                    <strong>{mode.name}</strong>
                    <span className="mode-description">{mode.description}</span>
                    <span className="mode-arrow">↗</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="section bottom-grid">
              <div className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">THE TOP COMPETITORS</span>
                    <h2>Leaderboard</h2>
                  </div>
                  <button className="text-button" onClick={() => setActiveTab('Leaderboard')}>See all ↗</button>
                </div>
                {players.map(player => (
                  <div className="player-row" key={player.rank}>
                    <span className="rank">{player.rank}</span>
                    <span className="player-avatar">{player.avatar}</span>
                    <strong>{player.name}</strong>
                    <span className="player-points">{player.points} pts</span>
                  </div>
                ))}
              </div>
              <div className="challenge-panel">
                <span className="challenge-icon">🎯</span>
                <span className="eyebrow">YOUR NEXT MISSION</span>
                <h2>Ready to prove yourself?</h2>
                <p>Every champion starts with one battle. Step into the arena.</p>
                <button className="secondary-button" onClick={() => setActiveTab('Discover')}>
                  Find a battle ↗
                </button>
              </div>
            </section>
          </>
        ) : (
          <section className="placeholder-page">
            <span className="eyebrow">BRAINY US</span>
            <h1>{activeTab}</h1>
            <p>This section is part of the upcoming Brainy US experience.</p>
            <button className="primary-button" onClick={() => setActiveTab('Home')}>Back to home ↗</button>
          </section>
        )}

        <footer>© 2026 Brainy US <span>SMART MINDS. BIG BATTLES.</span></footer>
      </section>
    </main>
  )
}

export default App
