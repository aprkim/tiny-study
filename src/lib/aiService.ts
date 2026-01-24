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

interface UsageStatus {
  used: number
  limit: number
  remaining: number
  trialExhausted: boolean
}

// Try Cloud Function first, fall back to user's own API key
export async function aiComplete(prompt: string, maxTokens = 800): Promise<string> {
  // First, try the Cloud Function (uses our API key with trial limits)
  try {
    const callable = httpsCallable<AICompleteRequest, AICompleteResponse>(functions, 'aiComplete')
    const result = await callable({ prompt, maxTokens })
    return result.data.text
  } catch (error: unknown) {
    // Check if trial exhausted
    const err = error as { code?: string; details?: { trialExhausted?: boolean } }
    if (err.code === 'functions/resource-exhausted' || err.details?.trialExhausted) {
      // Trial exhausted, try user's own API key
      if (hasApiKey()) {
        return aiCompleteWithUserKey(prompt, maxTokens)
      }
      throw new Error('Trial limit reached. Please add your own API key in Settings.')
    }

    // Other errors - try user's own API key as fallback
    if (hasApiKey()) {
      console.warn('Cloud Function failed, using user API key:', error)
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
    const callable = httpsCallable<unknown, UsageStatus>(functions, 'getUsageStatus')
    const result = await callable({})
    return result.data
  } catch {
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
  if (hasApiKey()) return true

  try {
    const status = await getUsageStatus()
    return !status.trialExhausted
  } catch {
    return false
  }
}
