import type { QuestionPack } from '../../shared/question-pack'

const DB_NAME = 'brainy-us-game-data'
const DB_VERSION = 1
const STORE_NAME = 'question-packs'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'manifest.packId',
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(
      request.error ?? new Error('Unable to open local game storage.'),
    )
  })
}

async function calculateContentHash(pack: QuestionPack): Promise<string> {
  const canonicalContent = JSON.stringify({
    schemaVersion: pack.manifest.schemaVersion,
    questions: pack.questions,
  })

  const encoded = new TextEncoder().encode(canonicalContent)
  const digest = await crypto.subtle.digest('SHA-256', encoded)

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyLocalPack(pack: QuestionPack): Promise<boolean> {
  if (pack.manifest.format !== 'brainy-us-question-pack') {
    return false
  }

  if (pack.manifest.schemaVersion !== 1) {
    return false
  }

  if (pack.manifest.questionCount !== pack.questions.length) {
    return false
  }

  if (pack.questions.length === 0) {
    return false
  }

  const questionIds = pack.questions.map(question => question.id)

  if (new Set(questionIds).size !== questionIds.length) {
    return false
  }

  for (const question of pack.questions) {
    if (!question.question.trim() || question.options.length !== 4) {
      return false
    }

    const optionIds = question.options.map(option => option.id)

    if (
      new Set(optionIds).size !== 4 ||
      !['A', 'B', 'C', 'D'].every(id => optionIds.includes(id as 'A' | 'B' | 'C' | 'D')) ||
      question.options.some(option => !option.text.trim())
    ) {
      return false
    }
  }

  const calculatedHash = await calculateContentHash(pack)

  return calculatedHash === pack.manifest.contentHash
}

export async function saveQuestionPack(pack: QuestionPack): Promise<void> {
  if (!(await verifyLocalPack(pack))) {
    throw new Error('Question pack failed local integrity verification.')
  }

  const db = await openDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')

      transaction.objectStore(STORE_NAME).put(pack)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(
        transaction.error ?? new Error('Unable to save question pack.'),
      )
      transaction.onabort = () => reject(
        transaction.error ?? new Error('Question pack storage was aborted.'),
      )
    })
  } finally {
    db.close()
  }
}

export async function getQuestionPack(
  packId: string,
): Promise<QuestionPack | null> {
  const db = await openDatabase()

  try {
    const pack = await new Promise<QuestionPack | null>((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(packId)

      request.onsuccess = () => resolve(
        (request.result as QuestionPack | undefined) ?? null,
      )
      request.onerror = () => reject(
        request.error ?? new Error('Unable to load question pack.'),
      )
    })

    if (pack && !(await verifyLocalPack(pack))) {
      throw new Error('Saved question pack failed integrity verification.')
    }

    return pack
  } finally {
    db.close()
  }
}

export async function listQuestionPacks(): Promise<QuestionPack[]> {
  const db = await openDatabase()

  try {
    const packs = await new Promise<QuestionPack[]>((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .getAll()

      request.onsuccess = () => resolve(request.result as QuestionPack[])
      request.onerror = () => reject(
        request.error ?? new Error('Unable to list question packs.'),
      )
    })

    for (const pack of packs) {
      if (!(await verifyLocalPack(pack))) {
        throw new Error(
          `Saved question pack ${pack.manifest.packId} failed integrity verification.`,
        )
      }
    }

    return packs
  } finally {
    db.close()
  }
}

export async function deleteQuestionPack(packId: string): Promise<void> {
  const db = await openDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')

      transaction.objectStore(STORE_NAME).delete(packId)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(
        transaction.error ?? new Error('Unable to delete question pack.'),
      )
      transaction.onabort = () => reject(
        transaction.error ?? new Error('Question pack deletion was aborted.'),
      )
    })
  } finally {
    db.close()
  }
}
