import './player/player-arcade.css'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import AuthScreen from './auth/AuthScreen'
import PlayerProfile from './player/PlayerProfile'
import BattleArena from './player/BattleArena'

type Screen = 'Home' | 'Online' | 'Offline' | 'Leaderboard' | 'Profile'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [activeScreen, setActiveScreen] = useState<Screen>('Home')
  const [checkingSession, setCheckingSession] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) console.error('Session check failed:', error.message)

      setSession(data.session)
      setCheckingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Keep authenticated players visible to the real-time presence server.
  useEffect(() => {
    const accessToken = session?.access_token
    if (!accessToken) return

    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectDelay = 1000
    let stopped = false

    function connect() {
      if (stopped) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${protocol}//${window.location.host}`)

      socket.onopen = () => {
        reconnectDelay = 1000
        socket?.send(JSON.stringify({
          type: 'AUTH',
          accessToken,
        }))
      }

      socket.onclose = () => {
        if (stopped) return

        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 15000)
          connect()
        }, reconnectDelay)
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      stopped = true

      if (reconnectTimer) clearTimeout(reconnectTimer)

      socket?.close()
    }
  }, [session?.access_token])

  async function handleSignOut() {
    setSigningOut(true)
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out failed:', error.message)
      setSigningOut(false)
    } else {
      setActiveScreen('Home')
      setSigningOut(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="loading-screen">
        <div className="loading-brand"><span>B</span> BRAINY <b>US</b></div>
        <div className="loading-orbit" />
        <p>Preparing your arena...</p>
      </main>
    )
  }

  if (!session) return <AuthScreen />

  const playerName =
    session.user.user_metadata?.username ||
    session.user.user_metadata?.display_name ||
    session.user.email?.split('@')[0] ||
    'Player'

  const initials = playerName.slice(0, 1).toUpperCase()

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <button
            className="app-brand"
            onClick={() => setActiveScreen('Home')}
            aria-label="Brainy US home"
          >
            <span className="brand-mark">B</span>
            <span className="brand-name">BRAINY <b>US</b></span>
          </button>

          <div className="header-actions">
            <div className="connection-status">
              <span />
              ONLINE
            </div>
            <button
              className="header-avatar"
              onClick={() => setActiveScreen('Profile')}
              aria-label="Open profile"
              title={playerName}
            >
              {initials}
            </button>
            <button
              className="signout-button"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Sign out"
              title="Sign out"
            >
              {signingOut ? '…' : 'EXIT'}
            </button>
          </div>
        </header>

        <div className="screen-content">
          {activeScreen === 'Home' && (
            <section className="home-screen">
              <div className="home-intro">
                <div className="welcome-label">
                  <span className="welcome-line" />
                  YOUR NEXT CHALLENGE AWAITS
                </div>
                <h1>Ready to<br /><span>make your move?</span></h1>
                <p>Choose how you want to play. The arena is yours.</p>
              </div>

              <div className="mode-selection">
                <button
                  className="game-mode-card online-card"
                  onClick={() => setActiveScreen('Online')}
                >
                  <div className="mode-card-top">
                    <span className="mode-icon online-icon">01</span>
                    <span className="mode-badge live-badge"><i /> LIVE ARENA</span>
                  </div>
                  <div className="mode-card-art online-art">
                    <div className="art-ring ring-one" />
                    <div className="art-ring ring-two" />
                    <div className="art-core">B</div>
                  </div>
                  <div className="mode-card-copy">
                    <span className="mode-kicker">COMPETE WORLDWIDE</span>
                    <h2>ONLINE</h2>
                    <p>Enter the Battle Arena. Face real players, fight for the top and claim your victory.</p>
                  </div>
                  <div className="mode-card-action">
                    <span>ENTER ONLINE ARENA</span>
                  </div>
                </button>

                <button
                  className="game-mode-card offline-card"
                  onClick={() => setActiveScreen('Offline')}
                >
                  <div className="mode-card-top">
                    <span className="mode-icon offline-icon">02</span>
                    <span className="mode-badge local-badge">LOCAL PLAY</span>
                  </div>
                  <div className="mode-card-art offline-art">
                    <div className="offline-orbit orbit-one" />
                    <div className="offline-orbit orbit-two" />
                    <div className="offline-symbol">LOCAL</div>
                    <span className="offline-player player-one">●</span>
                    <span className="offline-player player-two">●</span>
                    <span className="offline-player player-three">●</span>
                  </div>
                  <div className="mode-card-copy">
                    <span className="mode-kicker">BRING YOUR FRIENDS</span>
                    <h2>OFFLINE</h2>
                    <p>Create a local room and challenge friends nearby, even without internet.</p>
                  </div>
                  <div className="mode-card-action">
                    <span>EXPLORE OFFLINE PLAY</span>
                  </div>
                </button>
              </div>

              <div className="home-footnote">
                ONE PLATFORM. TWO WAYS TO BATTLE.
              </div>
            </section>
          )}

          {activeScreen === 'Online' && (
            <section className="destination-screen">
              <button className="back-home" onClick={() => setActiveScreen('Home')}>
                <span>BACK TO HOME</span>
              </button>
              <BattleArena />
            </section>
          )}

          {activeScreen === 'Offline' && (
            <section className="offline-screen">
              <button className="back-home" onClick={() => setActiveScreen('Home')}>
                <span>BACK TO HOME</span>
              </button>
              <div className="offline-heading">
                <span className="welcome-label"><span className="welcome-line" /> LOCAL MULTIPLAYER</span>
                <h1>Your crew.<br /><span>Your arena.</span></h1>
                <p>Play together on the same local network or nearby devices.</p>
              </div>
              <div className="offline-coming-card">
                <div className="offline-coming-icon">LOCAL</div>
                <span className="mode-kicker">LOCAL BATTLE MODE</span>
                <h2>Offline multiplayer is next.</h2>
                <p>We're building room creation, room joining and local match synchronization. This section will become playable when that system is implemented.</p>
                <span className="coming-label">COMING IN THE NEXT BUILD</span>
              </div>
            </section>
          )}

          {activeScreen === 'Leaderboard' && (
            <section className="simple-screen">
              <span className="welcome-label"><span className="welcome-line" /> THE COMPETITION</span>
              <h1>Leaderboard</h1>
              <p>See who's rising through the Brainy US ranks.</p>
              <div className="simple-empty-card">
                <span className="rank-mark">RANK</span>
                <h2>The rankings are coming.</h2>
                <p>Player rankings will appear here as match results are recorded.</p>
              </div>
            </section>
          )}

          {activeScreen === 'Profile' && (
            <PlayerProfile user={session.user} />
          )}
        </div>

        <nav className="bottom-nav" aria-label="Main navigation">
          <button
            className={`bottom-nav-item ${activeScreen === 'Home' ? 'selected' : ''}`}
            onClick={() => setActiveScreen('Home')}
          >
            <span className="bottom-nav-icon">H</span>
            <span>Home</span>
          </button>
          <button
            className={`bottom-nav-item ${activeScreen === 'Online' || activeScreen === 'Offline' ? 'selected' : ''}`}
            onClick={() => setActiveScreen('Online')}
          >
            <span className="bottom-nav-icon">B</span>
            <span>Battles</span>
          </button>
          <button
            className={`bottom-nav-item ${activeScreen === 'Leaderboard' ? 'selected' : ''}`}
            onClick={() => setActiveScreen('Leaderboard')}
          >
            <span className="bottom-nav-icon">R</span>
            <span>Ranks</span>
          </button>
          <button
            className={`bottom-nav-item ${activeScreen === 'Profile' ? 'selected' : ''}`}
            onClick={() => setActiveScreen('Profile')}
          >
            <span className="bottom-nav-icon">P</span>
            <span>Profile</span>
          </button>
        </nav>
      </div>
    </main>
  )
}

export default App
