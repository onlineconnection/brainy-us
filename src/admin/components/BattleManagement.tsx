import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import './BattleManagement.css'

interface Battle {
  id: string
  title: string
  description: string | null
  status: string
  category: string
  difficulty: string
  entry_fee: number
  currency: string
  prize_pool: number
  max_players: number | null
  winner_count: number
  question_count: number
  duration_minutes: number
  seconds_per_question: number
  registration_opens_at: string | null
  registration_closes_at: string | null
  starts_at: string | null
  created_at: string
}

interface PreviewQuestion {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  question_order: number
}

const initialForm = {
  title: '',
  description: '',
  category: 'General Knowledge',
  difficulty: 'Mixed',
  entry_fee: '0',
  currency: 'USD',
  prize_pool: '0',
  max_players: '50',
  winner_count: '1',
  duration_minutes: '15',
  seconds_per_question: '15',
  registration_opens_at: '',
  registration_closes_at: '',
  starts_at: '',
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null
}

function formatDate(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString()
}

export default function BattleManagement() {
  const [battles, setBattles] = useState<Battle[]>([])
  const [form, setForm] = useState(initialForm)
  const [questionText, setQuestionText] = useState('')
  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [prizes, setPrizes] = useState<string[]>([''])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadBattles() {
    setLoading(true)

    const { data, error } = await supabase
      .from('battles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setBattles((data || []) as Battle[])
      setError('')
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadBattles()
  }, [])

  function updateField(name: string, value: string) {
    setForm(current => ({ ...current, [name]: value }))

    if (name === 'winner_count') {
      const count = Math.min(100, Math.max(1, Number(value) || 1))
      setPrizes(current =>
        Array.from({ length: count }, (_, index) => current[index] || '')
      )
    }
  }

  function updatePrize(index: number, value: string) {
    setPrizes(current =>
      current.map((prize, i) => i === index ? value : prize)
    )
  }

  async function previewBattleQuestions() {
    setError('')
    setMessage('')
    setPreviewQuestions([])

    if (!questionText.trim()) {
      setError('Upload or paste your battle questions first.')
      return
    }

    setPreviewing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const response = await fetch('/api/admin/battles/questions/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: questionText }),
      })

      const result = await response.json()

      if (!response.ok) {
        const details = Array.isArray(result.errors)
          ? result.errors.map((item: { line: number; message: string }) =>
              `Line ${item.line}: ${item.message}`
            ).join('\n')
          : result.error || 'Question preview failed.'

        throw new Error(details)
      }

      setPreviewQuestions(result.questions as PreviewQuestion[])
      setMessage(`${result.validQuestionCount} questions validated successfully. Review them before saving.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not preview questions.')
    } finally {
      setPreviewing(false)
    }
  }

  async function createBattle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    const maxPlayers = Number(form.max_players)
    const winners = Number(form.winner_count)
    const questionCount = previewQuestions.length
    const prizePool = Number(form.prize_pool)
    const entryFee = Number(form.entry_fee)
    const duration = Number(form.duration_minutes)
    const seconds = Number(form.seconds_per_question)

    if (!form.title.trim()) {
      setError('Please enter a battle title.')
      return
    }

    if (!Number.isInteger(maxPlayers) || maxPlayers < 1) {
      setError('Maximum players must be at least 1.')
      return
    }

    if (!Number.isInteger(winners) || winners < 1 || winners > maxPlayers) {
      setError('Winner count must be between 1 and maximum players.')
      return
    }

    if (questionCount < 1 || questionCount > 500) {
      setError('Preview and validate between 1 and 500 questions before saving.')
      return
    }

    if (!Number.isFinite(entryFee) || entryFee < 0 ||
        !Number.isFinite(prizePool) || prizePool < 0) {
      setError('Entry fee and prize pool cannot be negative.')
      return
    }

    if (!Number.isInteger(duration) || duration < 1 ||
        !Number.isInteger(seconds) || seconds < 1) {
      setError('Battle duration and seconds per question must be positive whole numbers.')
      return
    }

    if (prizePool > 0) {
      if (prizes.length !== winners) {
        setError('Prize allocation count must match the number of winners.')
        return
      }

      if (prizes.some(value => !value.trim() ||
          !Number.isFinite(Number(value)) || Number(value) <= 0)) {
        setError('Enter a valid positive prize amount for every winning position.')
        return
      }

      const totalPrizes = prizes.reduce((sum, value) => sum + Number(value), 0)

      if (totalPrizes > prizePool) {
        setError(`Prize allocations total ${totalPrizes.toFixed(2)}, exceeding the prize pool of ${prizePool.toFixed(2)} ${form.currency}.`)
        return
      }
    }

    if (form.registration_opens_at && form.registration_closes_at &&
      new Date(form.registration_closes_at) <= new Date(form.registration_opens_at)) {
      setError('Registration closing time must be after opening time.')
      return
    }

    if (form.registration_closes_at && form.starts_at &&
      new Date(form.starts_at) < new Date(form.registration_closes_at)) {
      setError('Battle start time must be after registration closes.')
      return
    }

    setSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const battle = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        difficulty: form.difficulty,
        entry_fee: entryFee,
        currency: form.currency,
        prize_pool: prizePool,
        max_players: maxPlayers,
        winner_count: winners,
        duration_minutes: duration,
        seconds_per_question: seconds,
        registration_opens_at: toIso(form.registration_opens_at),
        registration_closes_at: toIso(form.registration_closes_at),
        starts_at: toIso(form.starts_at),
      }

      const prizeRows = prizePool > 0
        ? prizes.map((amount, index) => ({
            position: index + 1,
            prize_amount: Number(amount),
          }))
        : []

      const response = await fetch('/api/admin/battles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          battle,
          text: questionText,
          questions: previewQuestions,
          prizes: prizeRows,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Battle creation failed.')
      }

      setMessage(
        `Battle saved as draft with ${result.questionCount} questions. Package hash: ${result.questionPackageHash}`
      )
      setForm(initialForm)
      setQuestionText('')
      setPreviewQuestions([])
      setPrizes([''])
      setShowForm(false)
      await loadBattles()
    } catch (err) {
      setError(`Battle creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  async function publishBattle(battle: Battle) {
    setError('')
    setMessage('')

    const { data: questionRows, error: questionError } = await supabase
      .from('battle_questions')
      .select('id')
      .eq('battle_id', battle.id)

    if (questionError) {
      setError(questionError.message)
      return
    }

    if ((questionRows || []).length !== battle.question_count) {
      setError(`This battle needs ${battle.question_count} questions before it can be published.`)
      return
    }

    if (battle.prize_pool > 0) {
      const { data: prizeRows, error: prizeError } = await supabase
        .from('battle_prizes')
        .select('position, prize_amount')
        .eq('battle_id', battle.id)
        .order('position')

      if (prizeError) {
        setError(prizeError.message)
        return
      }

      const allocations = prizeRows || []
      const total = allocations.reduce(
        (sum, prize) => sum + Number(prize.prize_amount),
        0
      )

      const positionsValid = allocations.length === battle.winner_count &&
        allocations.every((prize, index) => prize.position === index + 1)

      if (!positionsValid) {
        setError(`This battle needs prize allocations for all ${battle.winner_count} winning positions.`)
        return
      }

      if (total > battle.prize_pool) {
        setError('The configured prizes exceed this battle’s prize pool.')
        return
      }
    }

    const { error } = await supabase
      .from('battles')
      .update({ status: 'published' })
      .eq('id', battle.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Battle published successfully.')
    await loadBattles()
  }

  async function deleteBattle(id: string) {
    if (!window.confirm('Are you sure you want to delete this battle and its associated questions and prizes?')) return

    setError('')
    setMessage('')

    const { error } = await supabase
      .from('battles')
      .delete()
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Battle deleted.')
    await loadBattles()
  }

  return (
    <section className="battle-management">
      <div className="battle-management-header">
        <div>
          <span className="battle-management-eyebrow">COMPETITION CONTROL</span>
          <h1>Battle Management</h1>
          <p>Create, configure and publish complete online battles.</p>
        </div>
        <button className="battle-create-button" onClick={() => {
          setShowForm(!showForm)
          setError('')
          setMessage('')
        }}>
          {showForm ? 'Cancel' : '+ Create Battle'}
        </button>
      </div>

      {message && <div className="battle-notice success">{message}</div>}
      {error && <div className="battle-notice error">{error}</div>}

      {showForm && (
        <form className="battle-create-form" onSubmit={createBattle}>
          <div className="battle-form-heading">
            <h2>Create a complete battle</h2>
            <p>Configure the battle, add its questions and assign prizes before saving.</p>
          </div>

          <div className="battle-step-heading">
            <span>01</span>
            <div><h3>Battle settings</h3><p>Competition details and schedule</p></div>
          </div>

          <div className="battle-form-grid">
            <label className="battle-field full">
              Battle title *
              <input required value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="e.g. Friday Brain Battle" />
            </label>

            <label className="battle-field full">
              Description
              <textarea value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Describe this battle..." rows={3} />
            </label>

            <label className="battle-field">
              Question category
              <select value={form.category} onChange={e => updateField('category', e.target.value)}>
                <option>General Knowledge</option><option>Mathematics</option>
                <option>Science</option><option>Social Studies</option>
                <option>English</option><option>History</option>
                <option>Geography</option><option>Mixed</option>
              </select>
            </label>

            <label className="battle-field">
              Difficulty
              <select value={form.difficulty} onChange={e => updateField('difficulty', e.target.value)}>
                <option>Mixed</option><option>Easy</option>
                <option>Medium</option><option>Hard</option>
              </select>
            </label>

            <label className="battle-field">
              Maximum players
              <input type="number" min="1" required value={form.max_players} onChange={e => updateField('max_players', e.target.value)} />
            </label>

            <label className="battle-field">
              Number of winners
              <input type="number" min="1" max={form.max_players} required value={form.winner_count} onChange={e => updateField('winner_count', e.target.value)} />
              <small>How many positions receive prizes?</small>
            </label>

            <label className="battle-field">
              Validated questions
              <input type="text" readOnly value={`${previewQuestions.length} questions validated`} />
              <small>Import up to 500 questions in the Battle questions section below.</small>
            </label>

            <label className="battle-field">
              Seconds per question
              <input type="number" min="1" required value={form.seconds_per_question} onChange={e => updateField('seconds_per_question', e.target.value)} />
            </label>

            <label className="battle-field">
              Battle duration (minutes)
              <input type="number" min="1" required value={form.duration_minutes} onChange={e => updateField('duration_minutes', e.target.value)} />
            </label>

            <label className="battle-field">
              Entry fee
              <input type="number" min="0" step="0.01" required value={form.entry_fee} onChange={e => updateField('entry_fee', e.target.value)} />
            </label>

            <label className="battle-field">
              Currency
              <select value={form.currency} onChange={e => updateField('currency', e.target.value)}>
                <option value="USD">USD</option><option value="LRD">LRD</option>
              </select>
            </label>

            <label className="battle-field">
              Total prize pool
              <input type="number" min="0" step="0.01" required value={form.prize_pool} onChange={e => updateField('prize_pool', e.target.value)} />
            </label>

            <label className="battle-field">
              Registration opens
              <input type="datetime-local" value={form.registration_opens_at} onChange={e => updateField('registration_opens_at', e.target.value)} />
            </label>

            <label className="battle-field">
              Registration closes
              <input type="datetime-local" value={form.registration_closes_at} onChange={e => updateField('registration_closes_at', e.target.value)} />
            </label>

            <label className="battle-field">
              Battle starts
              <input type="datetime-local" value={form.starts_at} onChange={e => updateField('starts_at', e.target.value)} />
            </label>
          </div>

          <div className="battle-step-heading">
            <span>02</span>
            <div><h3>Battle questions</h3><p>Upload one TXT file containing up to 500 questions for this battle</p></div>
          </div>

          <div className="battle-question-list">
            <label className="battle-field">
              Upload question TXT file
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={async e => {
                  const file = e.currentTarget.files?.[0]
                  if (!file) return
                  const content = await file.text()
                  setQuestionText(content)
                  setPreviewQuestions([])
                  setError('')
                  setMessage(`${file.name} loaded. Preview the questions before saving.`)
                }}
              />
              <small>Maximum 500 questions. Each question must have exactly six lines, separated by a blank line.</small>
            </label>

            <label className="battle-field">
              Or paste your question TXT content
              <textarea
                rows={12}
                value={questionText}
                onChange={e => {
                  setQuestionText(e.target.value)
                  setPreviewQuestions([])
                  setMessage('')
                }}
                placeholder={'1. What is the capital of Liberia?\nA. Monrovia\nB. Gbarnga\nC. Buchanan\nD. Kakata\nAnswer: A\n\n2. Your next question?\nA. Option A\nB. Option B\nC. Option C\nD. Option D\nAnswer: B'}
              />
            </label>

            <div className="battle-form-actions">
              <button
                type="button"
                className="battle-create-button"
                onClick={() => void previewBattleQuestions()}
                disabled={previewing || !questionText.trim()}
              >
                {previewing ? 'Checking questions...' : 'Preview and Validate Questions'}
              </button>
              <span>{previewQuestions.length} / 500 questions validated</span>
            </div>

            {previewQuestions.length > 0 && (
              <div className="battle-question-preview">
                <h3>Question preview</h3>
                <p>All questions passed validation. Their unique IDs are ready to be saved with this battle.</p>
                {previewQuestions.map(question => (
                  <details key={question.id} className="battle-question-editor">
                    <summary>
                      Question {question.question_order}: {question.question_text}
                    </summary>
                    <ul>
                      <li>A. {question.option_a}</li>
                      <li>B. {question.option_b}</li>
                      <li>C. {question.option_c}</li>
                      <li>D. {question.option_d}</li>
                    </ul>
                    <small>Correct answer: {question.correct_answer} · ID: {question.id}</small>
                  </details>
                ))}
              </div>
            )}
          </div>

          <div className="battle-step-heading">
            <span>03</span>
            <div><h3>Prize distribution</h3><p>Set the exact amount for each winning position</p></div>
          </div>

          {Number(form.prize_pool) > 0 ? (
            <>
              <div className="battle-prize-summary">
                <span>Prize pool: <strong>{form.prize_pool} {form.currency}</strong></span>
                <span>Allocated: <strong>{prizes.reduce((sum, value) => sum + (Number(value) || 0), 0).toFixed(2)} {form.currency}</strong></span>
              </div>

              <div className="battle-prize-list">
                {prizes.map((prize, index) => (
                  <label className="battle-field battle-prize-field" key={index}>
                    <span className="battle-prize-position">#{index + 1}</span>
                    {index === 0 ? '1st place' : index === 1 ? '2nd place' : index === 2 ? '3rd place' : `${index + 1}th place`}
                    <input type="number" min="0.01" step="0.01" required value={prize} onChange={e => updatePrize(index, e.target.value)} placeholder={`Prize for position ${index + 1}`} />
                    <small>{form.currency}</small>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="battle-no-prize">
              No prize pool configured. This battle will have winners but no cash prize allocations.
            </div>
          )}

          <div className="battle-form-actions">
            <button type="button" className="battle-cancel-button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="battle-create-button" disabled={saving}>
              {saving ? 'Saving battle...' : 'Save Complete Battle as Draft'}
            </button>
          </div>
        </form>
      )}

      <div className="battle-list-heading">
        <div><h2>All battles</h2><p>{battles.length} battle{battles.length === 1 ? '' : 's'} created</p></div>
        <button className="battle-refresh-button" onClick={() => void loadBattles()}>↻ Refresh</button>
      </div>

      {loading ? (
        <p className="battle-empty">Loading battles...</p>
      ) : battles.length === 0 ? (
        <div className="battle-empty"><span>⚔</span><h3>No battles created yet</h3><p>Create your first battle to get started.</p></div>
      ) : (
        <div className="battle-admin-list">
          {battles.map(battle => (
            <article className="battle-admin-card" key={battle.id}>
              <div className="battle-admin-card-top">
                <div>
                  <span className={`battle-status ${battle.status === 'published' ? 'published' : 'draft'}`}>{battle.status}</span>
                  <h3>{battle.title}</h3>
                  <p>{battle.description || 'No description provided.'}</p>
                </div>
                <span className="battle-admin-category">{battle.category}</span>
              </div>

              <div className="battle-admin-stats">
                <div><strong>{battle.max_players ?? 'Unlimited'}</strong><span>Max players</span></div>
                <div><strong>{battle.winner_count}</strong><span>Winners</span></div>
                <div><strong>{battle.question_count}</strong><span>Questions</span></div>
                <div><strong>{battle.duration_minutes} min</strong><span>Duration</span></div>
                <div><strong>{battle.entry_fee} {battle.currency}</strong><span>Entry fee</span></div>
                <div><strong>{battle.prize_pool} {battle.currency}</strong><span>Prize pool</span></div>
              </div>

              <div className="battle-admin-card-bottom">
                <span>Starts: {formatDate(battle.starts_at)}</span>
                <div>
                  {battle.status !== 'published' && (
                    <button className="battle-publish-button" onClick={() => void publishBattle(battle)}>
                      Publish Battle
                    </button>
                  )}
                  <button className="battle-delete-button" onClick={() => void deleteBattle(battle.id)}>Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
