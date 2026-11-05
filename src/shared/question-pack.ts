export type AnswerOptionId = 'A' | 'B' | 'C' | 'D'

export interface PublicQuestion {
  id: string
  question: string
  options: {
    id: AnswerOptionId
    text: string
  }[]
}

export interface QuestionPack {
  manifest: {
    format: 'brainy-us-question-pack'
    schemaVersion: 1
    packId: string
    version: number
    questionCount: number
    contentHash: string
  }
  questions: PublicQuestion[]
}

export interface PrivateAnswerKey {
  packId: string
  contentHash: string
  answers: Record<string, AnswerOptionId>
}
