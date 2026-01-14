import Anthropic from "@anthropic-ai/sdk";

const STORAGE_KEY = "tiny-study-api-key";

let clientInstance: Anthropic | null = null;

export function getApiKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
  clientInstance = null; // Reset client so it gets recreated with new key
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
  clientInstance = null;
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export function getClient(): Anthropic | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  if (!clientInstance) {
    clientInstance = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  return clientInstance;
}
