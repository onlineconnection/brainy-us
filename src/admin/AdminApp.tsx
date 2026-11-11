import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Send,
  Swords,
  PlusCircle,
  ClipboardList,
  CreditCard,
  FileUp,
  Library,
  Users,
  Wallet,
  Settings,
  Bell,
  ArrowUpRight,
  ChevronDown,
  LogOut,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import './Admin.css'
import OfflineContent from './components/OfflineContent'
import BattleManagement from './components/BattleManagement'
import BattleCreation from './components/BattleCreation'
import { supabase } from '../lib/supabase'

const navigation = [
  {
    section: 'MAIN',
    items: [
      { name: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    section: 'ONLINE MANAGEMENT',
    items: [
      { name: 'Battle Creation', icon: PlusCircle },
      { name: 'Online Publishing', icon: Send },
      { name: 'Battles', icon: Swords },
      { name: 'Registrations', icon: ClipboardList },
      { name: 'Payments', icon: CreditCard },
    ],
  },
  {
    section: 'OFFLINE MANAGEMENT',
    items: [
      { name: 'Offline Publishing', icon: FileUp },
      { name: 'Practice Library', icon: Library },
    ],
  },
  {
    section: 'PLATFORM',
    items: [
      { name: 'Players', icon: Users },
      { name: 'Finance', icon: Wallet },
      { name: 'Settings', icon: Settings },
    ],
  },
]

function AdminDashboard({
  adminEmail,
  onSignOut,
}: {
  adminEmail: string
  onSignOut: () => void
}) {
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
          <ChevronDown className="workspace-arrow" size={15} />
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
                  <span className="admin-nav-icon"><item.icon size={17} strokeWidth={1.9} /></span>
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
            <div className="admin-avatar">{adminEmail.charAt(0).toUpperCase()}</div>
            <div className="admin-user-info">
              <strong>{adminEmail}</strong>
              <small>Verified administrator</small>
            </div>
            <button className="admin-signout" onClick={onSignOut} title="Sign out">
              <LogOut size={16} />
            </button>
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
            <button className="admin-icon-button" title="Notifications"><Bell size={17} /></button>
            <div className="admin-top-avatar">{adminEmail.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <div className="admin-content">
          {activePage === 'Battle Creation' ? (
            <BattleCreation />
          ) : activePage === 'Battles' ? (
            <BattleManagement />
          ) : activePage === 'Offline Publishing' ? (
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
                  <button onClick={() => setActivePage('Offline Publishing')}>
                    Manage question content <ArrowRight size={15} />
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
                    icon: Users,
                    note: presenceStatus === 'live'
                      ? 'Authenticated players connected now'
                      : presenceStatus === 'connecting'
                        ? 'Connecting to live presence...'
                        : 'Live connection unavailable',
                  },
                  { label: 'ACTIVE BATTLES', value: '—', icon: Swords, note: 'Live competitions' },
                  { label: 'QUESTION PACKS', value: '—', icon: Library, note: 'Published content' },
                  { label: 'PENDING APPROVALS', value: '—', icon: ClipboardList, note: 'Registration reviews' },
                ].map((stat) => (
                  <article className="admin-stat-card" key={stat.label}>
                    <div className="stat-card-top">
                      <span>{stat.label}</span>
                      <div><stat.icon size={18} strokeWidth={1.8} /></div>
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
                    <button onClick={() => setActivePage('Offline Publishing')}>
                      <span className="quick-icon purple"><FileUp size={19} /></span>
                      <span><strong>Import questions</strong><small>Add questions for offline games</small></span>
                      <b><ArrowUpRight size={17} /></b>
                    </button>
                    <button onClick={() => setActivePage('Battle Creation')}>
                      <span className="quick-icon orange"><Swords size={19} /></span>
                      <span><strong>Create a battle</strong><small>Set up a new competition</small></span>
                      <b><ArrowUpRight size={17} /></b>
                    </button>
                    <button onClick={() => setActivePage('Registrations')}>
                      <span className="quick-icon blue"><ClipboardList size={19} /></span>
                      <span><strong>Review registrations</strong><small>Manage player applications</small></span>
                      <b><ArrowUpRight size={17} /></b>
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
                  <div className="system-note">Administrator authentication is active. Your dashboard is protected.</div>
                </div>
              </section>
            </>
          ) : (
            <section className="admin-placeholder">
              <p className="admin-eyebrow">BRAINY US MANAGEMENT</p>
              <h1>{activePage}</h1>
              <p>This management section is ready for development.</p>
              <button className="back-overview" onClick={() => setActivePage('Overview')}>
                <ArrowLeft size={15} /> Back to overview
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}


function AdminApp() {
  const [authStatus, setAuthStatus] = useState<
    'checking' | 'signed-out' | 'denied' | 'authorized'
  >('checking')
  const [adminEmail, setAdminEmail] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true

    async function verifySession(session: any) {
      if (!session) {
        if (active) {
          setAdminEmail('')
          setAuthStatus('signed-out')
        }
        return
      }

      if (active) {
        setAuthStatus('checking')
        setAuthError('')
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        setAuthError('Unable to verify administrator access. Please try again.')
        setAuthStatus('denied')
        return
      }

      if (!data) {
        setAuthError('This account does not have administrator access.')
        setAuthStatus('denied')
        return
      }

      setAdminEmail(session.user.email || 'Administrator')
      setAuthStatus('authorized')
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Token refreshes must not unmount and reset the admin dashboard.
        if (event === 'TOKEN_REFRESHED') return

        // Defer the database query until the auth callback has completed.
        window.setTimeout(() => {
          void verifySession(session)
        }, 0)
      }
    )

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return

      if (error) {
        setAuthError('Unable to restore your login session.')
        setAuthStatus('signed-out')
        return
      }

      void verifySession(data.session)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginLoading(true)
    setAuthError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoginLoading(false)

    if (error) {
      setAuthError(error.message)
      return
    }

    setPassword('')
    setAuthStatus('checking')
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setAuthError('Unable to sign out. Please try again.')
      return
    }

    setAdminEmail('')
    setAuthError('')
    setAuthStatus('signed-out')
  }

  if (authStatus === 'checking') {
    return (
      <div className="admin-auth-screen">
        <div className="admin-auth-card">
          <div className="admin-brand-icon">B</div>
          <h1>Brainy <span>US</span></h1>
          <p>Verifying administrator access...</p>
          <div className="admin-auth-loader" />
        </div>
      </div>
    )
  }

  if (authStatus === 'denied') {
    return (
      <div className="admin-auth-screen">
        <div className="admin-auth-card">
          <div className="admin-auth-symbol">!</div>
          <p className="admin-eyebrow">ACCESS RESTRICTED</p>
          <h1>Administrator access required</h1>
          <p>{authError || 'Your account is not authorized to access this dashboard.'}</p>
          <button className="admin-auth-submit" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (authStatus === 'signed-out') {
    return (
      <div className="admin-auth-screen">
        <form className="admin-auth-card" onSubmit={handleLogin}>
          <div className="admin-brand-icon">B</div>
          <p className="admin-eyebrow">BRAINY US CONTROL CENTER</p>
          <h1>Admin sign in</h1>
          <p>Sign in with your authorized administrator account.</p>

          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            placeholder="admin@example.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />

          {authError && <div className="admin-auth-error">{authError}</div>}

          <button className="admin-auth-submit" type="submit" disabled={loginLoading}>
            {loginLoading ? 'Signing in...' : 'Sign in to dashboard'}
          </button>

          <small className="admin-auth-footer">
            Restricted access · Authorized administrators only
          </small>
        </form>
      </div>
    )
  }

  return <AdminDashboard adminEmail={adminEmail} onSignOut={handleSignOut} />
}

export default AdminApp
