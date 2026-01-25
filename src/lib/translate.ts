import { aiComplete, TrialExhaustedError } from "./aiService";

export async function translateToKorean(
  text: string,
  context?: string
): Promise<string> {
  if (!text.trim()) {
    return "";
  }

  try {
    let prompt = `Translate the following English text to Korean. Provide a natural, contextually appropriate translation.\n\n`;
    prompt += `Text to translate: "${text}"\n`;

    if (context) {
      prompt += `Context: "${context}"\n`;
    }

    prompt += `\nRespond with ONLY the Korean translation, nothing else.`;

    const responseText = await aiComplete(prompt, 200);
    return responseText.trim();
  } catch (error) {
    if (error instanceof TrialExhaustedError) throw error;
    console.error("Translation failed:", error);
    return "[번역 실패]";
  }
}
