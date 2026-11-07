import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import './Auth.css'

type AuthMode = 'login' | 'register' | 'reset'

function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
              display_name: username.trim(),
              phone_number: phone.trim(),
            },
          },
        })

        if (error) throw error

        if (data.session) {
          setMessage('Your account has been created. Welcome to Brainy US!')
        } else {
          setMessage(
            'Registration submitted. If email confirmation is enabled, check your inbox before logging in.'
          )
        }
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })

        if (error) throw error

        setMessage('If an account exists for this email, a password reset link will be sent.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isRegister = mode === 'register'
  const isReset = mode === 'reset'

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <a className="auth-brand" href="/">
          <span className="auth-brand-mark">B</span>
          <span>Brainy <b>US</b></span>
        </a>

        <div className="auth-heading">
          <span className="auth-eyebrow">SMART MINDS. BIG BATTLES.</span>
          <h1>
            {isRegister ? 'Create your account' : isReset ? 'Reset your password' : 'Welcome back'}
          </h1>
          <p>
            {isRegister
              ? 'Join the competition. Your next victory starts here.'
              : isReset
                ? 'Enter your email and we will send you a reset link.'
                : 'Sign in and get back into the arena.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={event => setUsername(event.target.value)}
                minLength={3}
                maxLength={24}
                autoComplete="username"
                required
              />

              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={event => setPhone(event.target.value)}
                autoComplete="tel"
                required
              />
            </>
          )}

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          {!isReset && (
            <>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                minLength={8}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
              />
            </>
          )}

          {mode === 'login' && (
            <button
              type="button"
              className="auth-text-button forgot-button"
              onClick={() => {
                setMode('reset')
                setMessage('')
                setError('')
              }}
            >
              Forgot password?
            </button>
          )}

          {error && <div className="auth-error" role="alert">{error}</div>}
          {message && <div className="auth-message" role="status">{message}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : isRegister
                ? 'Create account'
                : isReset
                  ? 'Send reset link'
                  : 'Sign in'}
          </button>
        </form>

        <div className="auth-switch">
          {isReset ? (
            <button
              className="auth-text-button"
              onClick={() => {
                setMode('login')
                setMessage('')
                setError('')
              }}
            >
              Back to sign in
            </button>
          ) : (
            <>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
              {' '}
              <button
                className="auth-text-button"
                onClick={() => {
                  setMode(isRegister ? 'login' : 'register')
                  setMessage('')
                  setError('')
                }}
              >
                {isRegister ? 'Sign in' : 'Create account'}
              </button>
            </>
          )}
        </div>

        <div className="auth-footer">© 2026 Brainy US · SMART MINDS. BIG BATTLES.</div>
      </section>
    </main>
  )
}

export default AuthScreen
