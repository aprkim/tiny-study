import { aiComplete, TrialExhaustedError } from "./aiService";

export async function translateToKorean(
  text: string,
  context?: string
): Promise<string> {
  if (!text.trim()) {
    return "";
  }

  try {
    let prompt: string;

    if (context) {
      // Translating a single term: the context only disambiguates meaning.
      prompt = `Translate ONLY the English term below into Korean, as it is used in the context sentence.\n\n`;
      prompt += `Term: "${text}"\n`;
      prompt += `Context sentence (do NOT translate this, use it only to pick the right meaning): "${context}"\n\n`;
      prompt += `Respond with ONLY the Korean translation of the term "${text}" — a word or short phrase, nothing else.`;
    } else {
      prompt = `Translate the following English text to Korean. Provide a natural, contextually appropriate translation.\n\n`;
      prompt += `Text to translate: "${text}"\n\n`;
      prompt += `Respond with ONLY the Korean translation, nothing else.`;
    }

    const responseText = await aiComplete(prompt, 200);
    return responseText.trim();
  } catch (error) {
    if (error instanceof TrialExhaustedError) throw error;
    console.error("Translation failed:", error);
    return "[번역 실패]";
  }
}
