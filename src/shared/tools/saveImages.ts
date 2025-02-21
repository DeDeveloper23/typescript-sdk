import { Tool } from "../../types.js";
import { z } from "zod";

// Schema for the save images request
export const SaveImagesRequestSchema = z.object({
  urls: z.array(z.string()),
  prompt: z.string(),
  revisedPrompts: z.array(z.string()).optional(),
  outputDir: z.string().optional()
});

// Schema for the save images response
export const SaveImagesResponseSchema = z.object({
  saved_paths: z.array(z.string()),
  message: z.string()
});

export const saveImagesTool: Tool = {
  name: "save_generated_images",
  title: "Save Generated Images",
  description: "Save generated images from URLs to local filesystem. The outputDir parameter should be the full absolute path to the target directory (e.g., /Users/username/path/to/directory). Relative paths like 'images' or '@images' will not work. The directory must already exist.",
  version: "1.0.0",
  inputSchema: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: { type: "string" },
        description: "Array of image URLs to save"
      },
      prompt: {
        type: "string",
        description: "The original prompt used to generate the images"
      },
      revisedPrompts: {
        type: "array",
        items: { type: "string" },
        description: "Optional array of revised prompts from DALL-E"
      },
      outputDir: {
        type: "string",
        description: "This is required for the tool to work. Full absolute path to the directory where images should be saved (e.g., /Users/username/path/to/directory). The directory must exist."
      }
    },
    required: ["urls", "prompt"]
  },
  requestSchema: SaveImagesRequestSchema,
  responseSchema: SaveImagesResponseSchema
}; 
