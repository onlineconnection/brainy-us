import { mkdir, writeFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseQuestionText } from './parser.js'
import { createQuestionPack } from './pack.js'

export async function publishQuestionText(input: string) {
  const parsed = parseQuestionText(input)

  if (!parsed.success) {
    return {
      success: false as const,
      parsed,
    }
  }

  const { playerPack, privateAnswerKey } =
    createQuestionPack(parsed.questions)

  const playerDirectory = resolve('storage/question-packs')
  const answerDirectory = resolve('storage/private-answer-keys')

  await mkdir(playerDirectory, { recursive: true })
  await mkdir(answerDirectory, { recursive: true })

  const packId = playerPack.manifest.packId

  const playerPath = resolve(playerDirectory, `${packId}.json`)
  const answerPath = resolve(answerDirectory, `${packId}.json`)

  await writeFile(answerPath, JSON.stringify(privateAnswerKey, null, 2), {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  })

  try {
    await writeFile(playerPath, JSON.stringify(playerPack, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
    })
  } catch (error) {
    await rm(answerPath, { force: true })
    throw error
  }

  return {
    success: true as const,
    pack: {
      packId,
      questionCount: playerPack.manifest.questionCount,
      contentHash: playerPack.manifest.contentHash,
      version: playerPack.manifest.version,
    },
  }
}
