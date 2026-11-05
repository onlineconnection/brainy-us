import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import {
  verifyQuestionPack,
  type QuestionPack,
} from './pack.js'

const OptionSchema = z.object({
  id: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().min(1),
})

const QuestionSchema = z.object({
  id: z.string().uuid(),
  question: z.string().min(1),
  options: z.array(OptionSchema).length(4),
})

const PackSchema = z.object({
  manifest: z.object({
    format: z.literal('brainy-us-question-pack'),
    schemaVersion: z.literal(1),
    packId: z.string().uuid(),
    version: z.number().int().positive(),
    questionCount: z.number().int().positive(),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  questions: z.array(QuestionSchema).min(1),
})

const PACK_DIRECTORY = resolve('storage/question-packs')

export async function getPlayerPack(
  packId: string,
): Promise<QuestionPack | null> {
  // Only accept UUIDs. This prevents directory traversal.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      packId,
    )
  ) {
    throw new Error('Invalid question pack ID.')
  }

  const filePath = resolve(PACK_DIRECTORY, `${packId}.json`)

  let fileContent: string

  try {
    fileContent = await readFile(filePath, 'utf8')
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return null
    }

    throw error
  }

  let rawData: unknown

  try {
    rawData = JSON.parse(fileContent)
  } catch {
    throw new Error('Question pack contains invalid JSON.')
  }

  const result = PackSchema.safeParse(rawData)

  if (!result.success) {
    throw new Error('Question pack failed structural validation.')
  }

  const pack = result.data

  if (pack.manifest.packId !== packId) {
    throw new Error('Question pack ID does not match its filename.')
  }

  if (pack.manifest.questionCount !== pack.questions.length) {
    throw new Error('Question pack count does not match its contents.')
  }

  for (const question of pack.questions) {
    const optionIds = question.options.map(option => option.id)

    if (new Set(optionIds).size !== 4) {
      throw new Error('Question pack contains duplicate option IDs.')
    }
  }

  if (!verifyQuestionPack(pack as QuestionPack)) {
    throw new Error('Question pack integrity verification failed.')
  }

  return pack as QuestionPack
}
