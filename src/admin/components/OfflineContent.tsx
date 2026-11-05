import { useState } from 'react'

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

const exampleQuestions = `1. What is the capital of Liberia?
A. Accra
B. Monrovia
C. Lagos
D. Abuja
Answer: B

2. What is 5 multiplied by 5?
A. 10
B. 15
C. 20
D. 25
Answer: D`

function OfflineContent() {
  const [questionText, setQuestionText] = useState('')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [publishedPack, setPublishedPack] = useState<PublishedPack | null>(null)
  const [loading, setLoading] = useState<'preview' | 'publish' | null>(null)
  const [requestError, setRequestError] = useState('')

  async function submitQuestions(action: 'preview' | 'publish') {
    if (!questionText.trim()) {
      setRequestError('Paste your questions before continuing.')
      return
    }

    setLoading(action)
    setRequestError('')
    setPublishedPack(null)

    try {
      const response = await fetch(
        `/api/admin/offline-content/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: questionText }),
        },
      )

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

  function loadExample() {
    setQuestionText(exampleQuestions)
    setPreview(null)
    setPublishedPack(null)
    setRequestError('')
  }

  return (
    <div className="offline-content-page">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">CONTENT MANAGEMENT</p>
          <h1>Offline Content</h1>
          <p>Create and publish question packs for local multiplayer games.</p>
        </div>
        <span className="admin-date">QUESTION IMPORT</span>
      </div>

      <section className="admin-panel offline-editor">
        <div className="panel-heading">
          <div>
            <h3>Import questions</h3>
            <p>Paste your questions using the Brainy US TXT format.</p>
          </div>
          <span className="offline-format-badge">TXT FORMAT</span>
        </div>

        <div className="offline-editor-toolbar">
          <span>QUESTION SOURCE</span>
          <button type="button" onClick={loadExample}>
            Load example
          </button>
        </div>

        <textarea
          className="offline-question-input"
          value={questionText}
          onChange={(event) => {
            setQuestionText(event.target.value)
            setPreview(null)
            setPublishedPack(null)
            setRequestError('')
          }}
          placeholder={`1. What is the capital of Liberia?\nA. Accra\nB. Monrovia\nC. Lagos\nD. Abuja\nAnswer: B\n\n2. Your next question...`}
          spellCheck={false}
        />

        <div className="offline-editor-footer">
          <span>{questionText.trim() ? questionText.trim().split(/\n\s*\n/).length : 0} question blocks</span>
          <span>Four options per question · A–D</span>
        </div>

        {requestError && (
          <div className="offline-error-banner" role="alert">
            {requestError}
          </div>
        )}

        <div className="offline-actions">
          <button
            type="button"
            className="offline-preview-button"
            disabled={loading !== null}
            onClick={() => submitQuestions('preview')}
          >
            {loading === 'preview' ? 'Checking questions...' : 'Preview Questions'}
          </button>

          <button
            type="button"
            className="offline-publish-button"
            disabled={loading !== null}
            onClick={() => submitQuestions('publish')}
          >
            {loading === 'publish' ? 'Publishing...' : 'Publish Question Pack →'}
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
            <div>
              <strong>{preview.totalBlocks}</strong>
              <span>Question blocks</span>
            </div>
            <div>
              <strong>{preview.validQuestionCount}</strong>
              <span>Valid questions</span>
            </div>
            <div>
              <strong>{preview.errors.length}</strong>
              <span>Errors</span>
            </div>
          </div>

          {preview.errors.length > 0 && (
            <div className="offline-error-list">
              <h4>Issues to fix</h4>
              {preview.errors.map((error, index) => (
                <div key={`${error.line}-${index}`}>
                  <strong>Line {error.line}</strong>
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          )}

          {preview.questions.length > 0 && (
            <div className="offline-question-preview">
              <h4>Question preview</h4>
              {preview.questions.map((question) => (
                <article key={question.id}>
                  <strong>{question.sourceNumber}. {question.question}</strong>
                  <div className="offline-options-grid">
                    {question.options.map((option) => (
                      <span key={option.id}>
                        <b>{option.id}.</b> {option.text}
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
            <p>Your content has been saved and is ready for integration with offline multiplayer.</p>
            <div className="offline-pack-details">
              <span>PACK ID</span>
              <code>{publishedPack.packId}</code>
              <span>QUESTIONS</span>
              <strong>{publishedPack.questionCount}</strong>
              <span>VERSION</span>
              <strong>{publishedPack.version}</strong>
              <span>CONTENT HASH</span>
              <code>{publishedPack.contentHash}</code>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default OfflineContent
