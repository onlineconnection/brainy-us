import { useEffect, useState } from 'react'
import './Admin.css'
import OfflineContent from './components/OfflineContent'
import BattleManagement from './components/BattleManagement'

const navigation = [
  { section: 'MAIN MENU', items: [
    { name: 'Overview', icon: '◫' },
    { name: 'Offline Content', icon: '▤' },
    { name: 'Question Packs', icon: '▣' },
  ]},
  { section: 'COMPETITIONS', items: [
    { name: 'Battles', icon: '⚔' },
    { name: 'Registrations', icon: '♙' },
    { name: 'Payments', icon: '◈' },
  ]},
  { section: 'SYSTEM', items: [
    { name: 'Players', icon: '♧' },
    { name: 'Settings', icon: '⚙' },
  ]},
]

function AdminApp() {
  const [activePage, setActivePage] = useState('Overview')
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null)
  const [presenceStatus, setPresenceStatus] = useState<'connecting' | 'live' | 'offline'>('connecting')

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    function connect() {
      if (stopped) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${protocol}//${window.location.host}`)

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          if (
            message.type === 'ONLINE_STATS' &&
            typeof message.onlinePlayers === 'number'
          ) {
            setOnlinePlayers(message.onlinePlayers)
            setPresenceStatus('live')
          }
        } catch {
          // Ignore messages that are not valid JSON.
        }
      }

      socket.onclose = () => {
        if (stopped) return

        setPresenceStatus('offline')
        reconnectTimer = setTimeout(connect, 3000)
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
  }, [])

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">B</div>
          <div>
            <strong>Brainy <span>US</span></strong>
            <small>CONTROL CENTER</small>
          </div>
        </div>

        <div className="admin-workspace">
          <span className="workspace-dot" />
          Administration
          <span className="workspace-arrow">⌄</span>
        </div>

        <nav className="admin-navigation">
          {navigation.map((group) => (
            <div className="admin-nav-group" key={group.section}>
              <p className="admin-nav-heading">{group.section}</p>
              {group.items.map((item) => (
                <button
                  key={item.name}
                  className={`admin-nav-item ${activePage === item.name ? 'active' : ''}`}
                  onClick={() => setActivePage(item.name)}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  {item.name}
                  {item.name === 'Registrations' && (
                    <span className="nav-count">0</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-user">
            <div className="admin-avatar">A</div>
            <div className="admin-user-info">
              <strong>Administrator</strong>
              <small>Platform Manager</small>
            </div>
            <span>•••</span>
          </div>
          <p className="admin-version">BRAINY US · ADMIN PORTAL</p>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <span>Brainy US</span>
            <span>/</span>
            <strong>{activePage}</strong>
          </div>
          <div className="admin-top-actions">
            <div className="admin-server-status">
              <span className="workspace-dot" />
              System online
            </div>
            <button className="admin-icon-button" title="Notifications">♧</button>
            <div className="admin-top-avatar">A</div>
          </div>
        </header>

        <div className="admin-content">
          {activePage === 'Battles' ? (
            <BattleManagement />
          ) : activePage === 'Offline Content' ? (
            <OfflineContent />
          ) : activePage === 'Overview' ? (
            <>
              <div className="admin-page-heading">
                <div>
                  <p className="admin-eyebrow">CONTROL CENTER</p>
                  <h1>Overview</h1>
                  <p>Manage your Brainy US gaming platform from one place.</p>
                </div>
                <span className="admin-date">ADMIN DASHBOARD</span>
              </div>

              <section className="admin-welcome">
                <div>
                  <span className="welcome-label">BRAINY US MANAGEMENT</span>
                  <h2>Welcome to your command center.</h2>
                  <p>Manage content, organize competitions and oversee your players.</p>
                  <button onClick={() => setActivePage('Offline Content')}>
                    Manage question content <span>→</span>
                  </button>
                </div>
                <div className="welcome-decoration">B</div>
              </section>

              <div className="admin-section-title">
                <div>
                  <h2>Platform overview</h2>
                  <p>Your platform statistics will appear here.</p>
                </div>
                <span className="live-indicator"><span /> LIVE SYSTEM</span>
              </div>

              <section className="admin-stats">
                {[
                  {
                    label: 'ONLINE PLAYERS',
                    value: onlinePlayers === null ? '—' : String(onlinePlayers),
                    icon: '♙',
                    note: presenceStatus === 'live'
                      ? 'Authenticated players connected now'
                      : presenceStatus === 'connecting'
                        ? 'Connecting to live presence...'
                        : 'Live connection unavailable',
                  },
                  { label: 'ACTIVE BATTLES', value: '—', icon: '⚔', note: 'Live competitions' },
                  { label: 'QUESTION PACKS', value: '—', icon: '▣', note: 'Published content' },
                  { label: 'PENDING APPROVALS', value: '—', icon: '◷', note: 'Registration reviews' },
                ].map((stat) => (
                  <article className="admin-stat-card" key={stat.label}>
                    <div className="stat-card-top">
                      <span>{stat.label}</span>
                      <div>{stat.icon}</div>
                    </div>
                    <strong>{stat.value}</strong>
                    <small>{stat.note}</small>
                  </article>
                ))}
              </section>

              <section className="admin-lower-grid">
                <div className="admin-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Quick actions</h3>
                      <p>Common administration tasks</p>
                    </div>
                  </div>
                  <div className="quick-actions">
                    <button onClick={() => setActivePage('Offline Content')}>
                      <span className="quick-icon purple">▤</span>
                      <span><strong>Import questions</strong><small>Add questions for offline games</small></span>
                      <b>→</b>
                    </button>
                    <button onClick={() => setActivePage('Battles')}>
                      <span className="quick-icon orange">⚔</span>
                      <span><strong>Create a battle</strong><small>Set up a new competition</small></span>
                      <b>→</b>
                    </button>
                    <button onClick={() => setActivePage('Registrations')}>
                      <span className="quick-icon blue">♙</span>
                      <span><strong>Review registrations</strong><small>Manage player applications</small></span>
                      <b>→</b>
                    </button>
                  </div>
                </div>

                <div className="admin-panel system-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>System status</h3>
                      <p>Application infrastructure</p>
                    </div>
                    <span className="system-online">ONLINE</span>
                  </div>
                  <div className="system-row"><span>Application server</span><strong><i /> Operational</strong></div>
                  <div className="system-row"><span>WebSocket server</span><strong><i /> Operational</strong></div>
                  <div className="system-row"><span>Question pack service</span><strong><i /> Available</strong></div>
                  <div className="system-note">Database and authentication integration will be connected in a later development step.</div>
                </div>
              </section>
            </>
          ) : (
            <section className="admin-placeholder">
              <p className="admin-eyebrow">BRAINY US MANAGEMENT</p>
              <h1>{activePage}</h1>
              <p>This management section is ready for development.</p>
              <button className="back-overview" onClick={() => setActivePage('Overview')}>
                ← Back to overview
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminApp
