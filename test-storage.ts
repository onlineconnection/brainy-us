import { readdir } from 'node:fs/promises'
import { getPlayerPack } from './src/server/questions/storage.ts'

async function main() {
  const files = await readdir('./storage/question-packs')
  const packFile = files.find(file => file.endsWith('.json'))

  if (!packFile) {
    throw new Error('No player pack found.')
  }

  const packId = packFile.replace('.json', '')
  const pack = await getPlayerPack(packId)

  console.log('STORAGE TESTS')
  console.log('Pack found:', pack !== null ? 'PASS' : 'FAIL')
  console.log('Pack ID:', pack?.manifest.packId)
  console.log('Questions loaded:', pack?.questions.length)

  const missing = await getPlayerPack(
    '00000000-0000-4000-8000-000000000000',
  )
  console.log('Missing pack handled:', missing === null ? 'PASS' : 'FAIL')

  try {
    await getPlayerPack('../../private-answer-keys')
    console.log('Invalid ID protection: FAIL')
  } catch {
    console.log('Invalid ID protection: PASS')
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
