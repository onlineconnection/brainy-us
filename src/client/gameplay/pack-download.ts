import { z } from 'zod'
import type { QuestionPack } from '../../shared/question-pack'
import { saveQuestionPack } from './pack-storage'

const OptionSchema = z.object({
  id: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().min(1),
}).strict()

const QuestionSchema = z.object({
  id: z.string().uuid(),
  question: z.string().min(1),
  options: z.array(OptionSchema).length(4),
}).strict()

const QuestionPackSchema = z.object({
  manifest: z.object({
    format: z.literal('brainy-us-question-pack'),
    schemaVersion: z.literal(1),
    packId: z.string().uuid(),
    version: z.number().int().positive(),
    questionCount: z.number().int().positive(),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
  questions: z.array(QuestionSchema).min(1),
}).strict()

export async function downloadQuestionPack(
  packId: string,
): Promise<QuestionPack> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(packId)
  ) {
    throw new Error('Invalid question pack ID.')
  }

  const response = await fetch(
    `/api/packs/${encodeURIComponent(packId)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (response.status === 404) {
    throw new Error('This question pack could not be found.')
  }

  if (!response.ok) {
    throw new Error(`Download failed. Server returned ${response.status}.`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    throw new Error('The server returned an invalid response.')
  }

  const rawData: unknown = await response.json()
  const result = QuestionPackSchema.safeParse(rawData)

  if (!result.success) {
    throw new Error('Downloaded question pack has an invalid structure.')
  }

  const pack = result.data as QuestionPack

  if (pack.manifest.packId !== packId) {
    throw new Error('Downloaded pack ID does not match the requested ID.')
  }

  // This independently verifies SHA-256 before saving locally.
  await saveQuestionPack(pack)

  return pack
}
