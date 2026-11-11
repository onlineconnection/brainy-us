import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './Registrations.css'

interface Registration {
  id: string
  battle_id: string
  player_id: string
  status: string
  payment_status: string
  entry_fee_paid: number
  payment_reference: string | null
  payment_sender_number: string | null
  submitted_at: string
  payment_submitted_at: string | null
  reviewed_at: string | null
  admin_note: string | null
}

interface Battle {
  id: string
  title: string
  entry_fee: number
  currency: string
}

export default function Registrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  async function loadRegistrations() {
    setLoading(true)
    setError('')

    const [registrationResult, battleResult] = await Promise.all([
      supabase
        .from('registrations')
        .select(`
          id,
          battle_id,
          player_id,
          status,
          payment_status,
          entry_fee_paid,
          payment_reference,
          payment_sender_number,
          submitted_at,
          payment_submitted_at,
          reviewed_at,
          admin_note
        `)
        .order('submitted_at', { ascending: false }),

      supabase
        .from('battles')
        .select('id, title, entry_fee, currency'),
    ])

    if (registrationResult.error) {
      setError(registrationResult.error.message)
    } else {
      setRegistrations((registrationResult.data || []) as Registration[])
    }

    if (battleResult.error) {
      setError(previous =>
        previous
          ? `${previous} | ${battleResult.error.message}`
          : battleResult.error.message
      )
    } else {
      setBattles((battleResult.data || []) as Battle[])
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadRegistrations()
  }, [])

  async function updateRegistration(
    registration: Registration,
    changes: Record<string, string | number | null>,
    successMessage: string
  ) {
    setProcessingId(registration.id)
    setError('')
    setMessage('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Your administrator session has expired. Please sign in again.')
      }

      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          ...changes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', registration.id)

      if (updateError) throw updateError

      setMessage(successMessage)
      await loadRegistrations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update registration.')
    } finally {
      setProcessingId(null)
    }
  }

  function getBattle(battleId: string) {
    return battles.find(battle => battle.id === battleId)
  }

  function shortBattleId(battleId: string) {
    return `BATTLE-${battleId.replace(/-/g, '').slice(0, 6).toUpperCase()}`
  }

  const visibleRegistrations = registrations.filter(registration => {
    if (filter === 'pending') return registration.status === 'pending'
    if (filter === 'approved') return registration.status === 'approved'
    if (filter === 'rejected') return registration.status === 'rejected'
    if (filter === 'payment') return registration.payment_status === 'pending'
    return true
  })

  return (
    <section className="registrations-page">
      <div className="registrations-header">
        <div>
          <p className="registrations-eyebrow">BATTLE ROYALE MANAGEMENT</p>
          <h1>Registrations</h1>
          <p>Review player applications and verify battle entry payments.</p>
        </div>
        <button
          className="registrations-refresh"
          onClick={() => void loadRegistrations()}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {message && <div className="registrations-notice success">{message}</div>}
      {error && <div className="registrations-notice error">{error}</div>}

      <div className="registrations-summary">
        <article>
          <span>TOTAL</span>
          <strong>{registrations.length}</strong>
        </article>
        <article>
          <span>AWAITING APPROVAL</span>
          <strong>{registrations.filter(item => item.status === 'pending').length}</strong>
        </article>
        <article>
          <span>APPROVED</span>
          <strong>{registrations.filter(item => item.status === 'approved').length}</strong>
        </article>
        <article>
          <span>PAYMENTS PENDING</span>
          <strong>{registrations.filter(item => item.payment_status === 'pending').length}</strong>
        </article>
      </div>

      <div className="registrations-list-heading">
        <div>
          <h2>Player applications</h2>
          <p>{visibleRegistrations.length} registration(s)</p>
        </div>
        <select
          value={filter}
          onChange={event => setFilter(event.target.value)}
          aria-label="Filter registrations"
        >
          <option value="all">All registrations</option>
          <option value="pending">Awaiting approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="payment">Payments pending</option>
        </select>
      </div>

      {loading ? (
        <div className="registrations-empty">Loading registrations...</div>
      ) : visibleRegistrations.length === 0 ? (
        <div className="registrations-empty">
          <h3>No registrations found</h3>
          <p>Player applications will appear here when they register for a published battle.</p>
        </div>
      ) : (
        <div className="registrations-list">
          {visibleRegistrations.map(registration => {
            const battle = getBattle(registration.battle_id)
            const busy = processingId === registration.id
            const isFreeBattle = Number(battle?.entry_fee || 0) <= 0

            return (
              <article className="registration-card" key={registration.id}>
                <div className="registration-card-top">
                  <div>
                    <span className="registration-battle-id">
                      {shortBattleId(registration.battle_id)}
                    </span>
                    <h3>{battle?.title || 'Battle details unavailable'}</h3>
                  </div>
                  <span className={`registration-status ${registration.status}`}>
                    {registration.status}
                  </span>
                </div>

                <div className="registration-details">
                  <div>
                    <span>PLAYER ID</span>
                    <strong>{registration.player_id}</strong>
                  </div>
                  <div>
                    <span>ENTRY FEE</span>
                    <strong>
                      {battle
                        ? `${battle.currency} ${Number(battle.entry_fee).toFixed(2)}`
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span>AMOUNT PAID</span>
                    <strong>{Number(registration.entry_fee_paid).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>PAYMENT STATUS</span>
                    <strong className={`registration-payment ${registration.payment_status}`}>
                      {registration.payment_status}
                    </strong>
                  </div>
                  <div>
                    <span>PAYMENT REFERENCE</span>
                    <strong>{registration.payment_reference || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span>SENDER NUMBER</span>
                    <strong>{registration.payment_sender_number || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span>SUBMITTED</span>
                    <strong>{new Date(registration.submitted_at).toLocaleString()}</strong>
                  </div>
                  {registration.payment_submitted_at && (
                    <div>
                      <span>PAYMENT SUBMITTED</span>
                      <strong>{new Date(registration.payment_submitted_at).toLocaleString()}</strong>
                    </div>
                  )}
                </div>

                <div className="registration-actions">
                  {registration.status === 'pending' && (
                    <>
                      <button
                        className="registration-approve"
                        disabled={busy}
                        onClick={() => void updateRegistration(
                          registration,
                          {
                            status: 'approved',
                            ...(isFreeBattle ? { payment_status: 'not_required' } : {}),
                          },
                          isFreeBattle
                            ? 'Registration approved. No payment is required.'
                            : 'Registration approved. Payment verification is still required.'
                        )}
                      >
                        {busy ? 'Processing...' : 'Approve Registration'}
                      </button>
                      <button
                        className="registration-reject"
                        disabled={busy}
                        onClick={() => void updateRegistration(
                          registration,
                          { status: 'rejected' },
                          'Registration rejected.'
                        )}
                      >
                        Reject Registration
                      </button>
                    </>
                  )}

                  {!isFreeBattle && registration.payment_status === 'pending' && (
                    <>
                      <button
                        className="registration-verify"
                        disabled={busy}
                        onClick={() => void updateRegistration(
                          registration,
                          { payment_status: 'verified' },
                          'Payment verified successfully.'
                        )}
                      >
                        Verify Payment
                      </button>
                      <button
                        className="registration-reject-payment"
                        disabled={busy}
                        onClick={() => void updateRegistration(
                          registration,
                          { payment_status: 'rejected' },
                          'Payment rejected.'
                        )}
                      >
                        Reject Payment
                      </button>
                    </>
                  )}

                  {registration.status !== 'pending' &&
                    registration.payment_status !== 'pending' && (
                      <span className="registration-reviewed">
                        Registration and payment review completed
                      </span>
                    )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
