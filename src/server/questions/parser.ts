import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const answerIds = ['A', 'B', 'C', 'D'] as const

const optionSchema = z.object({
  id: z.enum(answerIds),
  text: z.string().trim().min(1, 'Answer option cannot be empty'),
})

const questionSchema = z.object({
  id: z.string().uuid(),
  sourceNumber: z.number().int().positive(),
  question: z.string().trim().min(1, 'Question cannot be empty'),
  options: z.array(optionSchema).length(4),
  correctAnswerId: z.enum(answerIds),
}).superRefine((question, context) => {
  const ids = question.options.map(option => option.id)

  if (new Set(ids).size !== 4) {
    context.addIssue({
      code: 'custom',
      message: 'Options must contain A, B, C and D exactly once',
    })
  }
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

function normalizeQuestion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function parseQuestionText(input: string): ParseResult {
  const questions: ParsedQuestion[] = []
  const errors: ImportError[] = []
  const seenQuestions = new Set<string>()

  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  const blocks: QuestionBlock[] = []

  let currentBlock: QuestionBlock | null = null

  // Separate the TXT file into question blocks.
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
      currentBlock = {
        startLine: index + 1,
        lines: [],
      }
    }

    currentBlock.lines.push(trimmed)
  })

  if (currentBlock) {
    blocks.push(currentBlock)
  }

  if (blocks.length === 0) {
    errors.push({
      line: 1,
      message: 'The TXT file contains no questions.',
    })
  }

  for (const block of blocks) {
    const { startLine, lines: blockLines } = block

    if (blockLines.length !== 6) {
      errors.push({
        line: startLine,
        message: 'Each question must contain exactly 6 lines: question, four options and answer.',
      })
      continue
    }

    const questionMatch = blockLines[0].match(/^(\d+)\.\s+(.+)$/)

    if (!questionMatch) {
      errors.push({
        line: startLine,
        message: 'Question must start with a number followed by a period.',
      })
      continue
    }

    const sourceNumber = Number(questionMatch[1])
    const questionText = questionMatch[2].trim()

    const options = []
    let invalidOption = false

    for (let index = 0; index < 4; index++) {
      const optionMatch = blockLines[index + 1].match(/^([A-D])\.\s*(.*)$/)

      if (!optionMatch) {
        errors.push({
          line: startLine + index + 1,
          message: `Expected option ${answerIds[index]}.`,
        })
        invalidOption = true
        break
      }

      if (optionMatch[1] !== answerIds[index]) {
        errors.push({
          line: startLine + index + 1,
          message: `Options must appear in A, B, C, D order. Expected ${answerIds[index]}.`,
        })
        invalidOption = true
        break
      }

      options.push({
        id: answerIds[index],
        text: optionMatch[2].trim(),
      })
    }

    if (invalidOption) continue

    const answerMatch = blockLines[5].match(/^Answer:\s*([A-D])$/i)

    if (!answerMatch) {
      errors.push({
        line: startLine + 5,
        message: 'Correct answer must use Answer: A, B, C or D.',
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
        message: validation.error.issues
          .map(issue => issue.message)
          .join('; '),
      })
      continue
    }

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
