import { Tool } from "../../types.js";
import { ImageGenerationRequestSchema, ImageGenerationResponseSchema, generateImage } from "../imageGeneration.js";

export const imageGenerationTool: Tool = {
  name: "image_generation",
  title: "Generate Images with DALL-E 3",
  description: "Generate images using OpenAI's DALL-E 3 model based on text prompts",
  version: "1.0.0",
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The text prompt to generate an image from"
      },
      size: {
        type: "string",
        enum: ["1024x1024", "1024x1792", "1792x1024"],
        default: "1024x1024",
        description: "The size of the generated image"
      },
      quality: {
        type: "string",
        enum: ["standard", "hd"],
        default: "standard",
        description: "The quality of the generated image"
      },
      style: {
        type: "string",
        enum: ["vivid", "natural"],
        default: "vivid",
        description: "The style of the generated image"
      },
      n: {
        type: "number",
        minimum: 1,
        maximum: 10,
        default: 1,
        description: "The number of images to generate"
      }
    },
    required: ["prompt"]
  },
  requestSchema: ImageGenerationRequestSchema,
  responseSchema: ImageGenerationResponseSchema,
  handler: generateImage,
}; 
