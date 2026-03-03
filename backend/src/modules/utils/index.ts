import OpenAI from "openai";
import { PDFDocument, type PDFPage } from "pdf-lib";
import {
  OPENAI_API_KEY,
  RESPONSE_GENERATOR_MODEL,
} from "../../config/variables";
import {
  downloadFilePresignedUrl,
  getFileBufferFromS3,
} from "../../utils/s3";

import fs from "fs";

/** Maximum number of PDF pages to send to the model (initial workflow upload). */
const MAX_PAGES_FOR_MODEL = 5;

/**
 * If the buffer is a PDF with more than maxPages pages, returns a new PDF with only the first maxPages pages.
 * Otherwise returns the original buffer.
 */
async function limitPdfToFirstNPages(
  buffer: Buffer,
  maxPages: number
): Promise<Buffer> {
  try {
    const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = src.getPageCount();
    if (pageCount <= maxPages) return buffer;
    const pageIndices = Array.from({ length: maxPages }, (_, i) => i);
    const newPdf = await PDFDocument.create();
    const copied = await newPdf.copyPages(src, pageIndices);
    copied.forEach((p: PDFPage) => newPdf.addPage(p));
    return Buffer.from(await newPdf.save());
  } catch {
    return buffer;
  }
}
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});
export async function generateAnswer(
  question: string,
  model?: string,
): Promise<string> {
  try {
    if (!question || question.trim().length === 0) {
      throw new Error("Question cannot be empty");
    }

    const result = await generateText({
      input: question,
      model: model || "gpt-5.2-2025-12-11",
    });

    return result.output_text || "Sorry, I could not generate an answer.";
  } catch (error: any) {
    console.error("Error generating answer:", error.message);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
}

export async function generateAnswerWithContext(
  question: string,
  context?: string,
  model?: string,
): Promise<string> {
  try {
    if (!question || question.trim().length === 0) {
      throw new Error("Question cannot be empty");
    }

    // Combine context and question if context is provided
    const prompt = context
      ? `Context: ${context}\n\nQuestion: ${question}\n\nAnswer:`
      : question;

    const result = await generateText({
      input: prompt,
      model: model || "gpt-5.2-2025-12-11",
    });

    return result.output_text || "Sorry, I could not generate an answer.";
  } catch (error: any) {
    console.error("Error generating answer with context:", error.message);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
}

export async function generateTitle(
  text: string,
  maxLength: number = 60,
  model?: string,
): Promise<string> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    // If text is already short enough, return it as-is
    if (text.length <= maxLength) {
      return text.trim();
    }

    // Create prompt for title generation
    const prompt = `Generate a concise, descriptive title (maximum ${maxLength} characters) for the following text. Return ONLY the title text, nothing else, no quotes, no explanations:

${text}

Title:`;

    const result = await generateText({
      input: prompt,
      model: model || "gpt-5.2-2025-12-11",
    });

    // Extract generated title from response
    let generatedTitle =
      result.output_text?.trim() || text.substring(0, maxLength);

    // Remove any quotes if present
    generatedTitle = generatedTitle.replace(/^["']|["']$/g, "");

    // Ensure title doesn't exceed maxLength
    if (generatedTitle.length > maxLength) {
      generatedTitle = generatedTitle.substring(0, maxLength - 3) + "...";
    }

    // Fallback if title is empty or too short
    if (!generatedTitle || generatedTitle.length < 3) {
      generatedTitle =
        text.length > maxLength
          ? text.substring(0, maxLength - 3) + "..."
          : text;
    }

    return generatedTitle;
  } catch (error: any) {
    console.error("Error generating title:", error.message);

    // Fallback: Use first maxLength characters of text
    return text.length > maxLength
      ? text.substring(0, maxLength - 3) + "..."
      : text.trim();
  }
}

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
export async function generateText(
  data: GenerateTextRequest,
): Promise<GenerateTextResponse> {
  try {
    const model = data.model || "gpt-5.2-2025-12-11";

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
 * Stream text generation using OpenAI Chat Completions API
 * @param data - Request data for text generation
 * @param onChunk - Callback function that receives each chunk of text as it's generated
 * @returns Promise that resolves with the complete response including usage stats
 */
export async function generateTextStream(
  data: GenerateTextRequest,
  onChunk: (chunk: string) => void,
): Promise<{
  output_text: string;
  model: string;
  usage?: GenerateTextResponse["usage"];
}> {
  try {
    const model = data.model || "gpt-5.2-2025-12-11";
    let fullText = "";
    let usage: GenerateTextResponse["usage"] | undefined;
    let responseModel = model;

    const stream = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: data.input,
        },
      ],
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullText += content;
        onChunk(content);
      }

      // Capture model from any chunk that has it
      if (chunk.model) {
        responseModel = chunk.model;
      }

      // Usage information is typically in the last chunk when finish_reason is set
      if (chunk.usage) {
        usage = {
          prompt_tokens: chunk.usage.prompt_tokens || 0,
          completion_tokens: chunk.usage.completion_tokens || 0,
          total_tokens: chunk.usage.total_tokens || 0,
        };
      }
    }

    return {
      output_text: fullText,
      model: responseModel,
      usage,
    };
  } catch (error: any) {
    console.error("Error generating text stream with OpenAI:", error.message);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

export async function generateAnswerStreamForFileAndText(
  question: string,
  onChunk: (chunk: string) => void,
  model: string = RESPONSE_GENERATOR_MODEL || "",
  fileFields?: any, // fields for which we generate presigned URLs
): Promise<string> {
  try {
    const openai = new OpenAI();

    let content: any[] = [{ type: "input_text", text: question }];

    // Generate presigned URLs for each file field individually
    if (fileFields?.length) {
      for (const field of fileFields) {
        const url = await downloadFilePresignedUrl(field.fileUrl);
        content.push({ type: "input_file", file_url: url });
      }
    }
    const systemMessage = `You are a knowledgeable assistant specializing in the US permit process.`;
    // Stream response from OpenAI
    const stream = openai.responses.stream({
      model,
      input: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content,
        },
      ],
    });

    let finalText = "";

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        onChunk(event.delta);
        finalText += event.delta;
      }
    }

    return finalText || "Sorry, I could not generate an answer.";
  } catch (error: any) {
    console.error("Error generating answer stream:", error.message);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
}

export async function generateAnswerStream(
  question: string,
  onChunk: (chunk: string) => void,
  model?: string,
): Promise<string> {
  try {
    const result = await generateTextStream(
      {
        input: question,
        model: model || "gpt-5.2-2025-12-11",
      },
      onChunk,
    );

    return result.output_text || "Sorry, I could not generate an answer.";
  } catch (error: any) {
    console.error("Error generating answer stream:", error.message);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
}

export interface GenerateQuestionPromptOptions {
  originalQuestion: string;
  previousStepAns?: string;
  assistantRole?: string;
  includeContext?: boolean;
}

/**
 * Generates a reusable prompt for question rephrasing with optional context
 * @param options - Configuration options for the prompt
 * @returns Formatted prompt string
 */
export function generateQuestionPrompt(options: GenerateQuestionPromptOptions): string {
  const {
    originalQuestion,
    previousStepAns = "",
    assistantRole = "virtual assistant",
    includeContext = true
  } = options;

  // Build the prompt using the exact same pattern as the original
  const promptText = `You are a ${assistantRole}. I will provide you a question from my database. 
${includeContext && previousStepAns ? `Context (do NOT repeat this as JSON in your response):
The user previously provided this information: ${previousStepAns}
` : ''}Your task:
1. Rephrase the question so that the wording is slightly different each time, but the meaning, intent, and context must remain exactly the same.
2. Keep it concise and natural as if asking a client directly.
3. Do not add extra explanations, commentary, or steps—only the rephrased question.
4. Each client may receive the same question with different wording every time.
5. Convert any provided data into natural language (e.g., "Your state is Alabama").
6. Do NOT mention JSON, objects, keys, or technical terms.
7. Respond only in plain text.
Original question:
" ${originalQuestion} "`

  return promptText;
}

export async function getProjectInfoFromFile(
  question: string,
  model: any,
  clientPrompt: string,
  fileFields?: any,
): Promise<any> {
  try {
    const openai = new OpenAI();

    let content: any[] = [{ type: "input_text", text: question }];
    if (fileFields) {
      const isPdf =
        typeof fileFields === "string" &&
        fileFields.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        const buffer = await getFileBufferFromS3(fileFields);
        const truncated = await limitPdfToFirstNPages(buffer, MAX_PAGES_FOR_MODEL);
        const dataUrl = `data:application/pdf;base64,${truncated.toString("base64")}`;
        content.push({
          type: "input_file",
          file_data: dataUrl,
          filename: "document.pdf",
        });
      } else {
        const url = await downloadFilePresignedUrl(fileFields);
        content.push({ type: "input_file", file_url: url });
      }
    }
    if (clientPrompt) {
      content.push({ type: "input_text", text: clientPrompt });
    }

    const systemMessage = `You are a knowledgeable assistant specializing in the US permit process. Always respond with ONLY a valid JSON object, without any markdown formatting, code blocks, or additional text.`;

    const response = await openai.responses.create({
      model: model || "",
      input: [
        { role: "system", content: systemMessage },
        { role: "user", content },
      ],
    });

    return response.output_text;
  } catch (error: any) {
    console.error("Error generating JSON response:", error.message);
    throw new Error(`Failed to generate JSON response: ${error.message}`);
  }
}