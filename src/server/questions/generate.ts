import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseQuestionText } from './parser.js'
import { createQuestionPack } from './pack.js'

async function main() {
  const inputPath = process.argv[2]

  if (!inputPath) {
    console.error('Usage: npm run questions:generate -- <path-to-txt-file>')
    process.exit(1)
  }

  const absoluteInputPath = resolve(inputPath)
  const text = await readFile(absoluteInputPath, 'utf8')
  const parsed = parseQuestionText(text)

  if (!parsed.success) {
    console.error('Question import failed:')
    for (const error of parsed.errors) {
      console.error(`Line ${error.line}: ${error.message}`)
    }
    process.exit(1)
  }

  const { playerPack, privateAnswerKey } =
    createQuestionPack(parsed.questions)

  const playerDirectory = resolve('storage/question-packs')
  const answerDirectory = resolve('storage/private-answer-keys')

  await mkdir(playerDirectory, { recursive: true })
  await mkdir(answerDirectory, { recursive: true })

  const playerPath = resolve(
    playerDirectory,
    `${playerPack.manifest.packId}.json`,
  )

  const answerPath = resolve(
    answerDirectory,
    `${playerPack.manifest.packId}.json`,
  )

  await writeFile(playerPath, JSON.stringify(playerPack, null, 2), {
    encoding: 'utf8',
    flag: 'wx',
  })

  await writeFile(answerPath, JSON.stringify(privateAnswerKey, null, 2), {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  })

  console.log('QUESTION PACK GENERATED SUCCESSFULLY')
  console.log('Questions:', playerPack.manifest.questionCount)
  console.log('Pack ID:', playerPack.manifest.packId)
  console.log('SHA-256:', playerPack.manifest.contentHash)
  console.log('\nPlayer pack:', playerPath)
  console.log('Private answer key:', answerPath)
}

main().catch(error => {
  console.error('Generation failed:', error)
  process.exit(1)
})
