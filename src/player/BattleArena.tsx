import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './BattleArena.css'

interface Battle {
  id: string
  title: string
  description: string | null
  status: string
  entry_fee: number
  currency: string
  prize_pool: number
  question_count: number
  registration_opens_at: string | null
  registration_closes_at: string | null
  starts_at: string | null
}

type BattleFilter = 'all' | 'free' | 'paid'

function formatDate(value: string | null) {
  if (!value) return 'To be announced'

  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function BattleArena() {
  const [battles, setBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<BattleFilter>('all')
  const [selectedBattle, setSelectedBattle] = useState<Battle | null>(null)

  useEffect(() => {
    let active = true

    async function loadBattles() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('battles')
        .select(`
          id,
          title,
          description,
          status,
          entry_fee,
          currency,
          prize_pool,
          question_count,
          registration_opens_at,
          registration_closes_at,
          starts_at
        `)
        .eq('status', 'published')
        .order('starts_at', { ascending: true })

      if (!active) return

      if (error) {
        setError(error.message)
      } else {
        setBattles((data || []) as Battle[])
      }

      setLoading(false)
    }

    void loadBattles()

    return () => {
      active = false
    }
  }, [])

  const visibleBattles = battles.filter(battle => {
    if (filter === 'free') return Number(battle.entry_fee) === 0
    if (filter === 'paid') return Number(battle.entry_fee) > 0
    return true
  })

  return (
    <section className="battle-arena">
      <div className="battle-arena-heading">
        <div>
          <span className="eyebrow">FIND YOUR NEXT CHALLENGE</span>
          <h1>Battle Arena</h1>
          <p>Discover battles, compete and climb the ranks.</p>
        </div>
        <div className="battle-arena-count">
          <span>{battles.length}</span>
          <small>AVAILABLE</small>
        </div>
      </div>

      <div className="battle-filter-bar" aria-label="Filter battles">
        {([
          ['all', 'All battles'],
          ['free', 'Free'],
          ['paid', 'Paid'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            className={`battle-filter ${filter === value ? 'active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="battle-empty-state">
          <div className="battle-loading-icon">⚔️</div>
          <h2>Loading battles...</h2>
          <p>Finding your next challenge.</p>
        </div>
      ) : error ? (
        <div className="battle-empty-state battle-load-error">
          <h2>Couldn't load battles</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try again</button>
        </div>
      ) : visibleBattles.length === 0 ? (
        <div className="battle-empty-state">
          <div className="battle-loading-icon">🏟️</div>
          <h2>{battles.length === 0 ? 'The arena is waiting' : 'No battles in this filter'}</h2>
          <p>
            {battles.length === 0
              ? 'New battles will appear here when the organizers publish them.'
              : 'Try another filter to see available battles.'}
          </p>
        </div>
      ) : (
        <div className="battle-list">
          {visibleBattles.map(battle => (
            <article className="battle-card" key={battle.id}>
              <div className="battle-card-top">
                <span className="battle-status">
                  <span />
                  REGISTRATION BATTLE
                </span>
                <button
                  className="battle-info-button"
                  aria-label={`More information about ${battle.title}`}
                  title="Battle information"
                  onClick={() => setSelectedBattle(battle)}
                >
                  i
                </button>
              </div>

              <div className="battle-card-title">
                <h2>{battle.title}</h2>
                <p>{battle.description || 'Get ready to compete in this Brainy US battle.'}</p>
              </div>

              <div className="battle-card-stats">
                <div>
                  <span>ENTRY FEE</span>
                  <strong>
                    {Number(battle.entry_fee) === 0
                      ? 'FREE'
                      : `${battle.currency} ${Number(battle.entry_fee).toLocaleString()}`}
                  </strong>
                </div>
                <div>
                  <span>PRIZE POOL</span>
                  <strong>
                    {battle.currency} {Number(battle.prize_pool).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="battle-card-footer">
                <span>{battle.question_count} questions</span>
                <button onClick={() => setSelectedBattle(battle)}>
                  View battle <span>↗</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedBattle && (
        <div
          className="battle-modal-backdrop"
          onClick={() => setSelectedBattle(null)}
        >
          <section
            className="battle-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="battle-details-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="battle-modal-heading">
              <span className="eyebrow">BATTLE INFORMATION</span>
              <button
                className="battle-modal-close"
                onClick={() => setSelectedBattle(null)}
                aria-label="Close battle information"
              >
                ×
              </button>
            </div>

            <h2 id="battle-details-title">{selectedBattle.title}</h2>
            <p className="battle-modal-description">
              {selectedBattle.description || 'No additional description provided.'}
            </p>

            <div className="battle-modal-stats">
              <div>
                <span>Entry fee</span>
                <strong>
                  {Number(selectedBattle.entry_fee) === 0
                    ? 'FREE'
                    : `${selectedBattle.currency} ${Number(selectedBattle.entry_fee).toLocaleString()}`}
                </strong>
              </div>
              <div>
                <span>Prize pool</span>
                <strong>
                  {selectedBattle.currency} {Number(selectedBattle.prize_pool).toLocaleString()}
                </strong>
              </div>
              <div>
                <span>Questions</span>
                <strong>{selectedBattle.question_count}</strong>
              </div>
            </div>

            <div className="battle-modal-schedule">
              <div>
                <span>Registration opens</span>
                <strong>{formatDate(selectedBattle.registration_opens_at)}</strong>
              </div>
              <div>
                <span>Registration closes</span>
                <strong>{formatDate(selectedBattle.registration_closes_at)}</strong>
              </div>
              <div>
                <span>Battle starts</span>
                <strong>{formatDate(selectedBattle.starts_at)}</strong>
              </div>
            </div>

            <button
              className="battle-modal-done"
              onClick={() => setSelectedBattle(null)}
            >
              Close details
            </button>
          </section>
        </div>
      )}
    </section>
  )
}

export default BattleArena
