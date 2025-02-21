import { z } from "zod";
import { OpenAI } from "openai";
import { CallToolResult } from "../types.js";

// Schema for the image generation request
export const ImageGenerationRequestSchema = z.object({
  prompt: z.string(),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).optional().default("1024x1024"),
  quality: z.enum(["standard", "hd"]).optional().default("standard"),
  style: z.enum(["vivid", "natural"]).optional().default("vivid"),
  n: z.number().min(1).max(10).optional().default(1),
});

// Schema for the image generation response
export const ImageGenerationResponseSchema = z.object({
  images: z.array(z.object({
    url: z.string(),
    revised_prompt: z.string().optional(),
  })),
});

// The actual image generation function
export async function generateImage(params: z.infer<typeof ImageGenerationRequestSchema>): Promise<CallToolResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenAI API key is not available");
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: params.prompt,
      n: params.n,
      size: params.size,
      quality: params.quality,
      style: params.style,
    });

    return {
      content: response.data.map(image => ({
        type: "image" as const,
        data: image.url!,
        mimeType: "image/png",
      })),
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [{
          type: "text" as const,
          text: `Image generation failed: ${error.message}`,
        }],
        isError: true,
      };
    }
    throw error;
  }
} 
