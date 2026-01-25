import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import { getClient, hasApiKey } from './anthropic'

interface AICompleteRequest {
  prompt: string
  maxTokens?: number
}

interface AICompleteResponse {
  text: string
  remaining: number
}

export interface UsageStatus {
  used: number
  limit: number
  remaining: number
  trialExhausted: boolean
}

// Custom error for trial exhaustion
export class TrialExhaustedError extends Error {
  constructor() {
    super('Trial limit reached')
    this.name = 'TrialExhaustedError'
  }
}

// Try Cloud Function first, fall back to user's own API key
export async function aiComplete(prompt: string, maxTokens = 800): Promise<string> {
  console.log('[AI] aiComplete called, maxTokens:', maxTokens)

  // First, try the Cloud Function (uses our API key with trial limits)
  try {
    console.log('[AI] Calling Cloud Function...')
    const callable = httpsCallable<AICompleteRequest, AICompleteResponse>(functions, 'aiComplete')
    const result = await callable({ prompt, maxTokens })
    console.log('[AI] Cloud Function success, remaining:', result.data.remaining)
    return result.data.text
  } catch (error: unknown) {
    const err = error as { code?: string; details?: { trialExhausted?: boolean }; message?: string }
    console.warn('[AI] Cloud Function error:', err.code, err.message)

    // Check if trial exhausted
    if (err.code === 'functions/resource-exhausted' || err.details?.trialExhausted) {
      console.log('[AI] Trial exhausted')
      // Trial exhausted, try user's own API key
      if (hasApiKey()) {
        console.log('[AI] Falling back to user API key')
        return aiCompleteWithUserKey(prompt, maxTokens)
      }
      throw new TrialExhaustedError()
    }

    // Other errors - try user's own API key as fallback
    if (hasApiKey()) {
      console.warn('[AI] Cloud Function failed, using user API key:', error)
      return aiCompleteWithUserKey(prompt, maxTokens)
    }

    throw error
  }
}

// Use user's own API key directly
async function aiCompleteWithUserKey(prompt: string, maxTokens: number): Promise<string> {
  const client = getClient()
  if (!client) {
    throw new Error('No API key configured')
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}

// Get usage status from Cloud Function
export async function getUsageStatus(): Promise<UsageStatus> {
  try {
    console.log('[AI] Fetching usage status...')
    const callable = httpsCallable<unknown, UsageStatus>(functions, 'getUsageStatus')
    const result = await callable({})
    console.log('[AI] Usage status:', result.data)
    return result.data
  } catch (error) {
    console.warn('[AI] Failed to get usage status:', error)
    // If call fails, assume trial is available
    return {
      used: 0,
      limit: 20,
      remaining: 20,
      trialExhausted: false,
    }
  }
}

// Check if user has any AI capability (trial remaining OR own API key)
export async function hasAICapability(): Promise<boolean> {
  if (hasApiKey()) {
    console.log('[AI] User has own API key')
    return true
  }

  try {
    const status = await getUsageStatus()
    const capable = !status.trialExhausted
    console.log('[AI] hasAICapability:', capable, `(${status.used}/${status.limit})`)
    return capable
  } catch {
    return false
  }
}
