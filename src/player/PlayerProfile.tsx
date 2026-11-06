import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import './PlayerProfile.css'

interface PlayerProfileData {
  id: string
  player_tag: string | null
  username: string | null
  display_name: string | null
  phone_number: string | null
  account_status: string
  created_at: string
}

interface PlayerProfileProps {
  user: User
}

function PlayerProfile({ user }: PlayerProfileProps) {
  const [profile, setProfile] = useState<PlayerProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('profiles')
        .select('id, player_tag, username, display_name, phone_number, account_status, created_at')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        setError(error.message)
      } else {
        setProfile(data as PlayerProfileData | null)
      }

      setLoading(false)
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [user.id])

  const username =
    profile?.username ||
    user.user_metadata?.username ||
    user.email?.split('@')[0] ||
    'Player'

  const displayName = profile?.display_name || username

  async function copyPlayerId() {
    try {
      await navigator.clipboard.writeText(profile?.player_tag || '')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy Player ID. Please try again.')
    }
  }

  return (
    <section className="player-profile-page">
      <div className="profile-page-heading">
        <span className="eyebrow">YOUR BRAINY US ACCOUNT</span>
        <h1>Player Profile</h1>
        <p>Manage and view your player identity.</p>
      </div>

      {loading ? (
        <div className="profile-state">Loading your profile...</div>
      ) : error ? (
        <div className="profile-state profile-error">
          Could not load your profile: {error}
        </div>
      ) : !profile ? (
        <div className="profile-state profile-error">
          Your profile record could not be found. Please contact support.
        </div>
      ) : (
        <>
          <div className="profile-identity-card">
            <div className="profile-large-avatar">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="profile-account-label">PLAYER ACCOUNT</span>
              <h2>{displayName}</h2>
              <p>@{username}</p>
            </div>
            <span className={`profile-status ${profile.account_status}`}>
              {profile.account_status}
            </span>
          </div>

          <div className="profile-details-card">
            <div className="profile-card-heading">
              <h2>Account information</h2>
              <span>PERSONAL DETAILS</span>
            </div>

            <div className="profile-detail-row">
              <span>Username</span>
              <strong>{profile.username || 'Not set'}</strong>
            </div>

            <div className="profile-detail-row">
              <span>Display name</span>
              <strong>{profile.display_name || 'Not set'}</strong>
            </div>

            <div className="profile-detail-row">
              <span>Email address</span>
              <strong>{user.email || 'Not available'}</strong>
            </div>

            <div className="profile-detail-row">
              <span>Phone number</span>
              <strong>{profile.phone_number || 'Not provided'}</strong>
            </div>

            <div className="profile-detail-row">
              <span>Player ID</span>
              <div className="profile-id-value">
                <strong className="profile-player-id">{profile.player_tag || "Not assigned"}</strong>
                <button
                  type="button"
                  className="profile-copy-button"
                  onClick={copyPlayerId}
                >
                  {copied ? 'Copied!' : 'Copy ID'}
                </button>
              </div>
            </div>

            <div className="profile-detail-row">
              <span>Account created</span>
              <strong>
                {new Date(profile.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </strong>
            </div>
          </div>

          <p className="profile-security-note">
            Your Player Tag is your short, shareable Brainy US identity.
            Keep it available when contacting support.
          </p>
        </>
      )}
    </section>
  )
}

export default PlayerProfile
