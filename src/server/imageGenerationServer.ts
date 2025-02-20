import { McpServer } from "./mcp.js";
import { StdioServerTransport } from "./stdio.js";
import { OpenAI } from "openai";
import { CallToolResult } from "../types.js";
import { RequestHandlerExtra } from "../shared/protocol.js";
import { z } from "zod";
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";
import * as dotenv from "dotenv";
import { imageGenerationTool } from "../shared/tools/imageGeneration.js";
import { saveImagesTool } from "../shared/tools/saveImages.js";

dotenv.config();

type ImageGenerationParams = {
  prompt: string;
  size: "1024x1024" | "1024x1792" | "1792x1024";
  quality: "standard" | "hd";
  style: "vivid" | "natural";
  n: number;
};

type SaveImagesParams = {
  urls: string[];
  prompt: string;
  revisedPrompts?: string[];
  outputDir?: string;
};

async function saveGeneratedImages(
  urls: string[], 
  revisedPrompts: (string | undefined)[], 
  prompt: string,
  outputDir?: string
): Promise<string[]> {
  const targetDir = outputDir || path.join(process.cwd(), 'images');
  
  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  const savedPaths: string[] = [];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const revisedPrompt = revisedPrompts[i];
    
    // Download the image
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    // Generate a safe filename from the prompt
    const timestamp = Date.now();
    const safePrompt = prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${safePrompt}-${timestamp}-${i}.png`;
    const filePath = path.join(targetDir, filename);
    
    // Save image
    await fs.writeFile(filePath, Buffer.from(buffer));
    
    // Save metadata
    const metadata = {
      original_prompt: prompt,
      revised_prompt: revisedPrompt,
      url,
      timestamp,
      filename
    };
    
    await fs.writeFile(
      `${filePath}.json`,
      JSON.stringify(metadata, null, 2)
    );
    
    savedPaths.push(filePath);
  }
  
  return savedPaths;
}

async function saveImages(params: SaveImagesParams): Promise<CallToolResult> {
  try {
    const savedPaths = await saveGeneratedImages(
      params.urls, 
      params.revisedPrompts || params.urls.map(() => undefined), 
      params.prompt,
      params.outputDir
    );

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          saved_paths: savedPaths,
          message: `Successfully saved ${savedPaths.length} images to ${params.outputDir || 'images'} directory`
        })
      }]
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to save images: ${error.message}`,
        }],
        isError: true,
      };
    }
    throw error;
  }
}

async function generateImage(params: ImageGenerationParams): Promise<CallToolResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenAI API key is not available");
  }

  const openai = new OpenAI({
    apiKey: apiKey
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

    // Return URLs and revised prompts only
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          urls: response.data.map(image => image.url!),
          revised_prompts: response.data.map(image => image.revised_prompt)
        })
      }]
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

async function main() {
  // Create server with basic configuration
  const server = new McpServer(
    {
      name: "image-generation-server",
      version: "1.0.0",
      description: "A server that provides tools for generating and saving images using DALL-E 3"
    },
    {
      capabilities: {
        tools: {
          [imageGenerationTool.name]: imageGenerationTool,
          [saveImagesTool.name]: saveImagesTool
        }
      }
    }
  );

  // Register image generation tool
  server.tool(
    imageGenerationTool.name,
    imageGenerationTool.description || "Generate images using OpenAI's DALL-E 3 model based on text prompts",
    {
      prompt: z.string(),
      size: z.enum(["1024x1024", "1024x1792", "1792x1024"]),
      quality: z.enum(["standard", "hd"]),
      style: z.enum(["vivid", "natural"]),
      n: z.number().min(1).max(10),
    },
    async (args: ImageGenerationParams, _extra: RequestHandlerExtra) => generateImage(args)
  );

  // Register image saving tool
  server.tool(
    saveImagesTool.name,
    saveImagesTool.description || "Save generated images from URLs to local filesystem",
    {
      urls: z.array(z.string()),
      prompt: z.string(),
      revisedPrompts: z.array(z.string()).optional(),
      outputDir: z.string().optional(),
    },
    async (args: SaveImagesParams, _extra: RequestHandlerExtra) => saveImages(args)
  );

  // Set up stdio transport
  const transport = new StdioServerTransport();
  
  console.log("Starting image generation server with image generation and saving capabilities...");
  
  try {
    await server.connect(transport);
    console.log("Server connected and ready to handle requests! Available tools:");
    console.log(`- ${imageGenerationTool.name}: ${imageGenerationTool.description || "No description available"}`);
    console.log(`- ${saveImagesTool.name}: ${saveImagesTool.description || "No description available"}`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log("Shutting down server...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("Shutting down server...");
  process.exit(0);
});

main().catch(error => {
  console.error("Server error:", error);
  process.exit(1);
}); 
