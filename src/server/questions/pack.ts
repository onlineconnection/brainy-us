import { createHash, randomUUID } from 'node:crypto'
import type { ParsedQuestion } from './parser.js'
import type {
  PublicQuestion,
  QuestionPack,
  PrivateAnswerKey,
} from '../../shared/question-pack.js'

export type {
  PublicQuestion,
  QuestionPack,
  PrivateAnswerKey,
}

function calculateHash(
  schemaVersion: number,
  questions: PublicQuestion[],
): string {
  const canonicalContent = JSON.stringify({
    schemaVersion,
    questions,
  })

  return createHash('sha256')
    .update(canonicalContent, 'utf8')
    .digest('hex')
}

export function createQuestionPack(
  parsedQuestions: ParsedQuestion[],
  version = 1,
): {
  playerPack: QuestionPack
  privateAnswerKey: PrivateAnswerKey
} {
  if (parsedQuestions.length === 0) {
    throw new Error('Cannot generate an empty question pack.')
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new Error('Pack version must be a positive integer.')
  }

  const ids = parsedQuestions.map(question => question.id)

  if (new Set(ids).size !== ids.length) {
    throw new Error('Duplicate question IDs detected.')
  }

  const questions: PublicQuestion[] = parsedQuestions.map(question => ({
    id: question.id,
    question: question.question,
    options: question.options.map(option => ({
      id: option.id,
      text: option.text,
    })),
  }))

  const schemaVersion = 1
  const contentHash = calculateHash(schemaVersion, questions)
  const packId = randomUUID()

  const playerPack: QuestionPack = {
    manifest: {
      format: 'brainy-us-question-pack',
      schemaVersion: 1,
      packId,
      version,
      questionCount: questions.length,
      contentHash,
    },
    questions,
  }

  const privateAnswerKey: PrivateAnswerKey = {
    packId,
    contentHash,
    answers: Object.fromEntries(
      parsedQuestions.map(question => [
        question.id,
        question.correctAnswerId,
      ]),
    ),
  }

  return {
    playerPack,
    privateAnswerKey,
  }
}

export function verifyQuestionPack(pack: QuestionPack): boolean {
  if (pack.manifest.format !== 'brainy-us-question-pack') {
    return false
  }

  if (pack.manifest.schemaVersion !== 1) {
    return false
  }

  if (pack.manifest.questionCount !== pack.questions.length) {
    return false
  }

  const ids = pack.questions.map(question => question.id)

  if (new Set(ids).size !== ids.length) {
    return false
  }

  const calculatedHash = calculateHash(
    pack.manifest.schemaVersion,
    pack.questions,
  )

  return calculatedHash === pack.manifest.contentHash
}
