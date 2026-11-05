import { readFileSync } from 'node:fs'
import { parseQuestionText } from './src/server/questions/parser.ts'
import { createQuestionPack, verifyQuestionPack } from './src/server/questions/pack.ts'

const text = readFileSync('./src/server/questions/examples/sample-questions.txt', 'utf8')
const parsed = parseQuestionText(text)

if (!parsed.success) {
  console.error(parsed.errors)
  process.exit(1)
}

const { playerPack, privateAnswerKey } = createQuestionPack(parsed.questions)

console.log('PLAYER PACK:')
console.log(JSON.stringify(playerPack, null, 2))

console.log('\nPRIVATE ANSWER KEY:')
console.log(JSON.stringify(privateAnswerKey, null, 2))

console.log('\nSECURITY CHECKS:')
console.log('Pack integrity:', verifyQuestionPack(playerPack) ? 'PASS' : 'FAIL')
console.log(
  'Correct answers exposed in player pack:',
  JSON.stringify(playerPack).includes('correctAnswerId') ? 'YES - ERROR' : 'NO - PASS'
)
console.log('Question count:', playerPack.manifest.questionCount)
