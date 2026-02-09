import OpenAI from "openai";
import { OPENAI_API_KEY } from "../../config/variables";
import fs from "fs";
import path from "path";
import { VOICE_TO_TEXT_MODEL } from "../../config/variables";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY ,
});

export interface GenerateTextRequest {
  model?: string;
  input: string;
  store?: boolean;
}

export interface GenerateTextResponse {
  output_text: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate text using OpenAI Chat Completions API
 * Note: The user's original code referenced a non-existent API endpoint.
 * This uses the correct OpenAI Chat Completions API.
 */
export async function generateText(data: GenerateTextRequest): Promise<GenerateTextResponse> {
  try {
    const model = data.model || "GPT-5.2";
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: data.input,
        },
      ],
      temperature: 0.7,
    });

    const outputText = response.choices[0]?.message?.content || "";
    const usage = response.usage;

    return {
      output_text: outputText,
      model: response.model,
      usage: usage
        ? {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
          }
        : undefined,
    };
  } catch (error: any) {
    console.error("Error generating text with OpenAI:", error.message);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Generate a haiku about AI (example function as requested)
 */
export async function generateHaikuAboutAI(): Promise<string> {
  const result = await generateText({
    input: "write a haiku about ai",
    model: "GPT-5.2",
  });
  return result.output_text;
}



// export async function generateVoiceToText(filePath?: string): Promise<string> {
//   try {
//     const audioFilePath = filePath || path.join(__dirname, "Voicy_What's Love Got To Do With It.mp3");
//     const result = await openai.audio.transcriptions.create({
//       file: fs.createReadStream(audioFilePath),
//       model: VOICE_TO_TEXT_MODEL || "whisper-1",
//     });
//     console.log("🚀 ~ generateVoiceToText ~ result:", result.text)
//     return result.text;
//   } catch (error: any) {
//     console.error("Error generating voice to text with OpenAI:", error.message);
//     throw new Error(`OpenAI transcription error: ${error.message}`);
//   }
// }
// generateVoiceToText().then(console.log).catch(console.error);

export { openai };

