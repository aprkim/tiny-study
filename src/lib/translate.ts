import { getClient, hasApiKey } from "./anthropic";

export async function translateToKorean(
  text: string,
  context?: string
): Promise<string> {
  if (!text.trim()) {
    return "";
  }

  if (!hasApiKey()) {
    return "[API 키를 설정하세요]";
  }

  const client = getClient();
  if (!client) {
    return "[API 키를 설정하세요]";
  }

  try {
    let prompt = `Translate the following English text to Korean. Provide a natural, contextually appropriate translation.\n\n`;
    prompt += `Text to translate: "${text}"\n`;

    if (context) {
      prompt += `Context: "${context}"\n`;
    }

    prompt += `\nRespond with ONLY the Korean translation, nothing else.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    return responseText.trim();
  } catch (error) {
    console.error("Translation failed:", error);
    return "[번역 실패]";
  }
}
