import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const answerIds = ['A', 'B', 'C', 'D'] as const

const questionSchema = z.object({
  id: z.string().uuid(),
  sourceNumber: z.number().int().positive(),
  question: z.string().trim().min(1),
  options: z.array(z.object({
    id: z.enum(answerIds),
    text: z.string().trim().min(1),
  })).length(4),
  correctAnswerId: z.enum(answerIds),
})

export type ParsedQuestion = z.infer<typeof questionSchema>

export interface ImportError {
  line: number
  message: string
}

export interface ParseResult {
  totalBlocks: number
  questions: ParsedQuestion[]
  errors: ImportError[]
  success: boolean
}

interface QuestionBlock {
  startLine: number
  lines: string[]
}

function normalizeQuestion(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function parseQuestionText(input: string, maxQuestions = 500): ParseResult {
  const questions: ParsedQuestion[] = []
  const errors: ImportError[] = []
  const seenQuestions = new Set<string>()
  const seenNumbers = new Set<number>()

  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  const blocks: QuestionBlock[] = []
  let currentBlock: QuestionBlock | null = null

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (!trimmed) {
      if (currentBlock) {
        blocks.push(currentBlock)
        currentBlock = null
      }
      return
    }

    if (!currentBlock) {
      currentBlock = { startLine: index + 1, lines: [] }
    }

    currentBlock.lines.push(trimmed)
  })

  if (currentBlock) blocks.push(currentBlock)

  if (blocks.length === 0) {
    errors.push({ line: 1, message: 'The TXT file contains no questions.' })
  }

  if (blocks.length > maxQuestions) {
    errors.push({
      line: 1,
      message: `Maximum ${maxQuestions} questions allowed. Found ${blocks.length}.`,
    })

    return {
      totalBlocks: blocks.length,
      questions: [],
      errors,
      success: false,
    }
  }

  for (const block of blocks) {
    const { startLine, lines: blockLines } = block

    if (blockLines.length !== 6) {
      errors.push({
        line: startLine,
        message: 'Each question must contain exactly 6 lines: question, options A-D and correct answer. No explanations or extra lines.',
      })
      continue
    }

    const questionMatch = blockLines[0].match(/^(\d+)\.\s+(.+)$/)

    if (!questionMatch) {
      errors.push({
        line: startLine,
        message: 'Question must start with a number, period and question text. Example: 1. What is ...?',
      })
      continue
    }

    const sourceNumber = Number(questionMatch[1])
    const questionText = questionMatch[2].trim()

    if (!Number.isSafeInteger(sourceNumber) || sourceNumber < 1) {
      errors.push({ line: startLine, message: 'Question number must be a positive integer.' })
      continue
    }

    if (seenNumbers.has(sourceNumber)) {
      errors.push({ line: startLine, message: `Question number ${sourceNumber} is repeated.` })
      continue
    }

    const options: ParsedQuestion['options'] = []
    let invalidOption = false

    for (let index = 0; index < 4; index++) {
      const expected = answerIds[index]
      const optionMatch = blockLines[index + 1].match(/^([A-D])\.\s*(.*)$/)

      if (!optionMatch || optionMatch[1] !== expected || !optionMatch[2].trim()) {
        errors.push({
          line: startLine + index + 1,
          message: `Expected a non-empty option ${expected}. Example: ${expected}. Your answer`,
        })
        invalidOption = true
        break
      }

      options.push({
        id: expected,
        text: optionMatch[2].trim(),
      })
    }

    if (invalidOption) continue

    const answerMatch = blockLines[5].match(/^Answer:\s*([A-D])$/i)

    if (!answerMatch) {
      errors.push({
        line: startLine + 5,
        message: 'Correct answer must be exactly Answer: A, Answer: B, Answer: C or Answer: D.',
      })
      continue
    }

    const duplicateKey = normalizeQuestion(questionText)

    if (seenQuestions.has(duplicateKey)) {
      errors.push({
        line: startLine,
        message: `Duplicate question detected: "${questionText}"`,
      })
      continue
    }

    const candidate = {
      id: randomUUID(),
      sourceNumber,
      question: questionText,
      options,
      correctAnswerId: answerMatch[1].toUpperCase(),
    }

    const validation = questionSchema.safeParse(candidate)

    if (!validation.success) {
      errors.push({
        line: startLine,
        message: validation.error.issues.map(issue => issue.message).join('; '),
      })
      continue
    }

    seenNumbers.add(sourceNumber)
    seenQuestions.add(duplicateKey)
    questions.push(validation.data)
  }

  return {
    totalBlocks: blocks.length,
    questions,
    errors,
    success: errors.length === 0 && questions.length > 0,
  }
}
