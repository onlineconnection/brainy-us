import { useState } from 'react'
import { supabase } from '../../lib/supabase'

type AnswerId = 'A' | 'B' | 'C' | 'D'

interface QuestionDraft {
  id: number
  question: string
  options: Record<AnswerId, string>
  correctAnswerId: AnswerId
}

interface ParsedQuestion {
  id: string
  sourceNumber: number
  question: string
  options: { id: string; text: string }[]
  correctAnswerId: string
}

interface ImportError {
  line: number
  message: string
}

interface PreviewResult {
  success: boolean
  totalBlocks: number
  validQuestionCount: number
  questions: ParsedQuestion[]
  errors: ImportError[]
}

interface PublishedPack {
  packId: string
  questionCount: number
  contentHash: string
  version: number
}

const answerIds: AnswerId[] = ['A', 'B', 'C', 'D']

function createQuestion(id: number): QuestionDraft {
  return {
    id,
    question: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswerId: 'A',
  }
}

function toImportText(questions: QuestionDraft[]) {
  return questions.map((question, index) => [
    `${index + 1}. ${question.question.trim()}`,
    ...answerIds.map(letter => `${letter}. ${question.options[letter].trim()}`),
    `Answer: ${question.correctAnswerId}`,
  ].join('\n')).join('\n\n')
}

function OfflineContent() {
  const [questions, setQuestions] = useState<QuestionDraft[]>([createQuestion(1)])
  const [nextId, setNextId] = useState(2)
  const [mode, setMode] = useState<'editor' | 'bulk'>('editor')
  const [bulkText, setBulkText] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [publishedPack, setPublishedPack] = useState<PublishedPack | null>(null)
  const [loading, setLoading] = useState<'preview' | 'publish' | null>(null)
  const [requestError, setRequestError] = useState('')
  const [packTitle, setPackTitle] = useState('')
  const [packDescription, setPackDescription] = useState('')
  const [packCategory, setPackCategory] = useState('General')
  const [packDifficulty, setPackDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed')

  function updateQuestion(id: number, update: Partial<QuestionDraft>) {
    setQuestions(current => current.map(question =>
      question.id === id ? { ...question, ...update } : question,
    ))
    setPreview(null)
    setPublishedPack(null)
    setRequestError('')
  }

  function updateOption(id: number, letter: AnswerId, value: string) {
    setQuestions(current => current.map(question =>
      question.id === id
        ? { ...question, options: { ...question.options, [letter]: value } }
        : question,
    ))
    setPreview(null)
    setPublishedPack(null)
    setRequestError('')
  }

  function addQuestion() {
    setQuestions(current => [...current, createQuestion(nextId)])
    setNextId(current => current + 1)
    setPreview(null)
    setPublishedPack(null)
  }

  function removeQuestion(id: number) {
    if (questions.length === 1) {
      setRequestError('At least one question is required.')
      return
    }

    setQuestions(current => current.filter(question => question.id !== id))
    setPreview(null)
    setPublishedPack(null)
    setRequestError('')
  }

  function loadExample() {
    setQuestions([
      {
        id: 1,
        question: 'What is the capital of Liberia?',
        options: { A: 'Accra', B: 'Monrovia', C: 'Lagos', D: 'Abuja' },
        correctAnswerId: 'B',
      },
      {
        id: 2,
        question: 'What is 5 multiplied by 5?',
        options: { A: '10', B: '15', C: '20', D: '25' },
        correctAnswerId: 'D',
      },
    ])
    setNextId(3)
    setPreview(null)
    setPublishedPack(null)
    setRequestError('')
  }

  async function submitQuestions(action: 'preview' | 'publish') {
    const text = mode === 'editor' ? toImportText(questions) : bulkText

    if (!text.trim()) {
      setRequestError('Add at least one question before continuing.')
      return
    }

    if (mode === 'bulk') {
      const count = text.trim().split(/\\n\\s*\\n/).filter(block => block.trim()).length
      if (count > 500) {
        setRequestError(`This import contains ${count} questions. The maximum is 500.`)
        return
      }
    }

    if (mode === 'editor' && questions.length > 500) {
      setRequestError('The maximum is 500 questions per pack.')
      return
    }

    if (mode === 'editor') {
      const incomplete = questions.findIndex(question =>
        !question.question.trim() ||
        answerIds.some(letter => !question.options[letter].trim()),
      )

      if (incomplete !== -1) {
        setRequestError(`Complete the question and all four answers in Question ${incomplete + 1}.`)
        return
      }

      const seen = new Set<string>()
      for (let index = 0; index < questions.length; index++) {
        const key = questions[index].question.trim().toLowerCase().replace(/\s+/g, ' ')
        if (seen.has(key)) {
          setRequestError(`Question ${index + 1} is a duplicate. Please change it.`)
          return
        }
        seen.add(key)
      }
    }

    if (action === 'publish') {
      if (!packTitle.trim()) {
        setRequestError('Enter a title for this practice pack.')
        return
      }
      if (!packCategory.trim()) {
        setRequestError('Enter a category for this practice pack.')
        return
      }
    }

    setLoading(action)
    setRequestError('')
    setPublishedPack(null)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const response = await fetch(`/api/admin/offline-content/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text,
          title: packTitle.trim(),
          description: packDescription.trim(),
          category: packCategory.trim(),
          difficulty: packDifficulty,
        }),
      })

      const data = await response.json()

      if (!response.ok && response.status !== 422) {
        throw new Error(data.error || 'Something went wrong.')
      }

      if (action === 'preview') {
        setPreview(data)
      } else if (data.success) {
        setPublishedPack(data.pack)
        setPreview(null)
      } else {
        setPreview(data)
      }
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'Unable to contact the server.',
      )
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="offline-content-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">CONTENT MANAGEMENT</p>
          <h1>Question Studio</h1>
          <p>Create, validate and publish questions for Brainy US offline games.</p>
        </div>
        <span className="admin-date">CONTENT BUILDER</span>
      </div>

      <section className="admin-panel question-studio">
        <div className="studio-heading">
          <div>
            <span className="studio-kicker">QUESTION PACK BUILDER</span>
            <h2>Build your question pack</h2>
            <p>Create questions one at a time or import an existing TXT collection.</p>
          </div>
          <div className="studio-count">
            <strong>{mode === 'editor' ? questions.length : (bulkText.trim() ? bulkText.trim().split(/\n\s*\n/).length : 0)}</strong>
            <span>QUESTIONS</span>
          </div>
        </div>

        <div className="studio-metadata-grid">
          <label>
            <span className="studio-field-label">PACK TITLE</span>
            <input className="studio-question-field" value={packTitle}
              onChange={event => setPackTitle(event.target.value)}
              placeholder="e.g. Liberia General Knowledge" maxLength={120} />
          </label>
          <label>
            <span className="studio-field-label">CATEGORY</span>
            <input className="studio-question-field" value={packCategory}
              onChange={event => setPackCategory(event.target.value)}
              placeholder="e.g. General Knowledge" maxLength={80} />
          </label>
          <label>
            <span className="studio-field-label">DIFFICULTY</span>
            <select className="studio-question-field" value={packDifficulty}
              onChange={event => setPackDifficulty(event.target.value as typeof packDifficulty)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <label>
            <span className="studio-field-label">DESCRIPTION (OPTIONAL)</span>
            <textarea className="studio-question-field" value={packDescription}
              onChange={event => setPackDescription(event.target.value)}
              placeholder="What will players learn in this pack?"
              rows={2} maxLength={500} />
          </label>
        </div>

        <div className="studio-tabs">
          <button
            type="button"
            className={mode === 'editor' ? 'active' : ''}
            onClick={() => { setMode('editor'); setPreview(null); setRequestError('') }}
          >
            ✎ Visual editor
          </button>
          <button
            type="button"
            className={mode === 'bulk' ? 'active' : ''}
            onClick={() => { setMode('bulk'); setPreview(null); setRequestError('') }}
          >
            ⇧ Bulk import
          </button>
        </div>

        {mode === 'editor' ? (
          <div className="studio-question-list">
            {questions.map((question, index) => (
              <article className="studio-question-card" key={question.id}>
                <div className="studio-question-top">
                  <div className="studio-question-number">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>QUESTION {index + 1}</strong>
                  </div>
                  <button
                    type="button"
                    className="studio-remove"
                    onClick={() => removeQuestion(question.id)}
                    disabled={questions.length === 1}
                    title="Remove question"
                  >
                    Remove ×
                  </button>
                </div>

                <label className="studio-field-label" htmlFor={`question-${question.id}`}>
                  QUESTION TEXT
                </label>
                <textarea
                  id={`question-${question.id}`}
                  className="studio-question-field"
                  value={question.question}
                  onChange={event => updateQuestion(question.id, { question: event.target.value })}
                  placeholder="Write your question here..."
                  rows={2}
                />

                <div className="studio-answer-heading">
                  <span>ANSWER OPTIONS</span>
                  <small>Choose the correct answer below</small>
                </div>

                <div className="studio-answer-grid">
                  {answerIds.map(letter => (
                    <label
                      key={letter}
                      className={`studio-answer-option ${question.correctAnswerId === letter ? 'correct' : ''}`}
                    >
                      <span className="studio-answer-letter">{letter}</span>
                      <input
                        value={question.options[letter]}
                        onChange={event => updateOption(question.id, letter, event.target.value)}
                        placeholder={`Enter answer ${letter}...`}
                        aria-label={`Answer ${letter} for question ${index + 1}`}
                      />
                      <span className="studio-correct-indicator">
                        {question.correctAnswerId === letter ? '✓' : ''}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="studio-correct-row">
                  <span>Correct answer</span>
                  <div className="studio-correct-picker">
                    {answerIds.map(letter => (
                      <button
                        type="button"
                        key={letter}
                        className={question.correctAnswerId === letter ? 'selected' : ''}
                        onClick={() => updateQuestion(question.id, { correctAnswerId: letter })}
                        aria-pressed={question.correctAnswerId === letter}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}

            <button type="button" className="studio-add-question" onClick={addQuestion}>
              <span>＋</span>
              <strong>Add another question</strong>
              <small>Continue building your pack</small>
            </button>

            <div className="studio-toolbar">
              <button type="button" className="studio-example-button" onClick={loadExample}>
                Load example questions
              </button>
              <span>{questions.length} question{questions.length === 1 ? '' : 's'} added</span>
            </div>
          </div>
        ) : (
          <div className="studio-bulk">
            <div className="studio-bulk-info">
              <strong>Import questions in bulk</strong>
              <p>Each question needs six lines: the numbered question, four options and the correct answer.</p>
            </div>
            <div className="studio-file-upload">
              <label htmlFor="question-txt-file" className="studio-file-button">
                <span>↑</span> Choose TXT File
              </label>
              <input
                id="question-txt-file"
                className="studio-file-input"
                type="file"
                accept=".txt,text/plain"
                onChange={async event => {
                  const file = event.currentTarget.files?.[0]
                  if (!file) return

                  if (!file.name.toLowerCase().endsWith('.txt')) {
                    setRequestError('Please select a .txt file.')
                    event.currentTarget.value = ''
                    return
                  }

                  try {
                    const text = await file.text()
                    const trimmed = text.trim()
                    const count = trimmed
                      ? trimmed.split(/\r?\n\s*\r?\n/).filter(block => block.trim()).length
                      : 0

                    if (!count) {
                      setRequestError('The selected TXT file is empty.')
                      event.currentTarget.value = ''
                      return
                    }

                    if (count > 500) {
                      setRequestError(`This file contains ${count} questions. The maximum is 500.`)
                      event.currentTarget.value = ''
                      return
                    }

                    setBulkText(text)
                    setFileName(file.name)
                    setMode('bulk')
                    setPreview(null)
                    setPublishedPack(null)
                    setRequestError('')
                  } catch {
                    setRequestError('Unable to read this TXT file.')
                    event.currentTarget.value = ''
                  }
                }}
              />
              <small>{fileName ? `Selected: ${fileName}` : 'TXT format only · Maximum 500 questions'}</small>
            </div>

            <textarea
              className="studio-bulk-field"
              value={bulkText}
              onChange={event => {
                setBulkText(event.target.value)
                setFileName('')
                setPreview(null)
                setPublishedPack(null)
                setRequestError('')
              }}
              placeholder={`1. What is the capital of Liberia?\nA. Accra\nB. Monrovia\nC. Lagos\nD. Abuja\nAnswer: B`}
              spellCheck={false}
            />
            <button
              type="button"
              className="studio-example-button"
              onClick={() => {
                setBulkText(`1. What is the capital of Liberia?\nA. Accra\nB. Monrovia\nC. Lagos\nD. Abuja\nAnswer: B\n\n2. What is 5 multiplied by 5?\nA. 10\nB. 15\nC. 20\nD. 25\nAnswer: D`)
                setPreview(null)
                setRequestError('')
              }}
            >
              Load bulk example
            </button>
          </div>
        )}

        {requestError && <div className="offline-error-banner" role="alert">{requestError}</div>}

        <div className="studio-publish-actions">
          <button
            type="button"
            className="offline-preview-button"
            disabled={loading !== null}
            onClick={() => submitQuestions('preview')}
          >
            {loading === 'preview' ? 'Validating...' : 'Preview questions'}
          </button>
          <button
            type="button"
            className="offline-publish-button"
            disabled={loading !== null}
            onClick={() => submitQuestions('publish')}
          >
            {loading === 'publish' ? 'Publishing...' : 'Publish question pack →'}
          </button>
        </div>
      </section>

      {preview && (
        <section className="admin-panel offline-results">
          <div className="panel-heading">
            <div>
              <h3>Validation results</h3>
              <p>Review your questions before publishing.</p>
            </div>
            <span className={preview.success ? 'offline-result-success' : 'offline-result-warning'}>
              {preview.success ? 'VALID' : 'NEEDS ATTENTION'}
            </span>
          </div>

          <div className="offline-result-stats">
            <div><strong>{preview.totalBlocks}</strong><span>Question blocks</span></div>
            <div><strong>{preview.validQuestionCount}</strong><span>Valid questions</span></div>
            <div><strong>{preview.errors.length}</strong><span>Errors</span></div>
          </div>

          {preview.errors.length > 0 && (
            <div className="offline-error-list">
              <h4>Issues to fix</h4>
              {preview.errors.map((error, index) => (
                <div key={`${error.line}-${index}`}>
                  <strong>Line {error.line}</strong><span>{error.message}</span>
                </div>
              ))}
            </div>
          )}

          {preview.questions.length > 0 && (
            <div className="offline-question-preview">
              <h4>Question preview</h4>
              {preview.questions.map(question => (
                <article key={question.id}>
                  <strong>{question.sourceNumber}. {question.question}</strong>
                  <div className="offline-options-grid">
                    {question.options.map(option => (
                      <span key={option.id}>
                        <b>{option.id}.</b> {option.text}
                        {option.id === question.correctAnswerId && ' ✓'}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          {preview.success && (
            <p className="offline-ready-message">
              All questions are valid. You can now publish this pack.
            </p>
          )}
        </section>
      )}

      {publishedPack && (
        <section className="admin-panel offline-published">
          <div className="offline-published-icon">✓</div>
          <div>
            <h3>Question pack published!</h3>
            <p>Your content has been saved and is ready for offline gameplay.</p>
            <div className="offline-pack-details">
              <span>PACK ID</span><code>{publishedPack.packId}</code>
              <span>QUESTIONS</span><strong>{publishedPack.questionCount}</strong>
              <span>VERSION</span><strong>{publishedPack.version}</strong>
              <span>CONTENT HASH</span><code>{publishedPack.contentHash}</code>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default OfflineContent
