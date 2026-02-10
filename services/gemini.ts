
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AIConfig, PerformanceScore, ContentVariations, Platform } from "../types";

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_IMAGE = 'gemini-2.5-flash-image';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_VIDEO = 'veo-3.1-fast-generate-preview';

export interface HashtagSet {
  niche: string[];
  broad: string[];
  trending: string[];
}

export interface VisualHeadlineResult {
  headline: string;
  highlights: string[];
}

// Fixed visual headline generation with proper model and JSON handling
export const generateVisualHeadline = async (title: string, excerpt: string): Promise<VisualHeadlineResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Convert this news title into a catchy, short, and punchy headline for a social media graphic. 
  Original Title: "${title}"
  Excerpt: "${excerpt}"
  
  Requirements:
  1. Maximum 45 characters.
  2. Use "Power Words" that grab attention.
  3. Identify 1 or 2 most important words to highlight visually.
  
  Return JSON with 'headline' (string) and 'highlights' (array of strings).`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["headline", "highlights"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { headline: title.substring(0, 45), highlights: [] };
  }
};

// Fixed hashtag generation with proper model and JSON handling
export const generateHashtags = async (title: string, excerpt: string, brandName: string): Promise<HashtagSet> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate 15 SEO-optimized hashtags for a social post.
  Topic: "${title}"
  Context: "${excerpt}"
  Brand Name: "${brandName}"
  
  Requirements:
  1. Generate niche, broad, and trending arrays.
  
  Return JSON with niche, broad, and trending arrays.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            niche: { type: Type.ARRAY, items: { type: Type.STRING } },
            broad: { type: Type.ARRAY, items: { type: Type.STRING } },
            trending: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["niche", "broad", "trending"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { niche: ['news'], broad: ['update'], trending: ['trending'] };
  }
};

// Fixed generateSocialCaption to use 'X' instead of 'Twitter' to match ContentVariations type definition
export const generateSocialCaption = async (
  postTitle: string, 
  excerpt: string, 
  postLink: string, 
  config: AIConfig,
  toneOverride?: string
): Promise<ContentVariations> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const selectedTone = toneOverride || config.brandVoice;
  
  // Prompt updated to request 'X' instead of 'Twitter' to align with Platform enum values
  const prompt = `Write 4 social captions for: "${postTitle}". Excerpt: "${excerpt}". Link: "${postLink}". Voice: ${selectedTone}. Language: ${config.targetLanguage}. Return JSON with Facebook, Instagram, X, LinkedIn keys.`;
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        temperature: config.creativity,
        tools: config.useGrounding ? [{ googleSearch: {} }] : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            Facebook: { type: Type.STRING },
            Instagram: { type: Type.STRING },
            // Key updated to 'X' to align with Platform enum value used in ContentVariations interface
            X: { type: Type.STRING },
            LinkedIn: { type: Type.STRING }
          },
          // Updated required properties to match schema
          required: ["Facebook", "Instagram", "X", "LinkedIn"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    const fallback = `${postTitle} - ${postLink}`;
    // Fixed: return object with keys defined in ContentVariations interface using Platform enum
    return { 
      [Platform.FACEBOOK]: fallback, 
      [Platform.INSTAGRAM]: fallback, 
      [Platform.X]: fallback, 
      [Platform.LINKEDIN]: fallback 
    };
  }
};

// Fixed performance prediction with proper model and JSON handling
export const predictPerformance = async (title: string, caption: string): Promise<PerformanceScore> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analyze engagement potential for: Title: "${title}", Caption: "${caption}". Return JSON score (0-100), label, reasoning[], suggestions[].`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            label: { type: Type.STRING },
            reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["score", "label", "reasoning", "suggestions"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { score: 50, label: "Medium", reasoning: [], suggestions: [] };
  }
};

// Fixed generateAudioBrief to handle binary output properly from Gemini TTS
export const generateAudioBrief = async (text: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text: `Read this news brief professionally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) { return null; }
};

// Fixed generateVideoTeaser with Veo model and long-running operation polling
export const generateVideoTeaser = async (prompt: string, onProgress?: (msg: string) => void): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    onProgress?.("Contacting Veo Engine...");
    let operation = await ai.models.generateVideos({
      model: MODEL_VIDEO,
      prompt: `News teaser for: ${prompt}. Cinematic, broadcast style.`,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });
    while (!operation.done) {
      onProgress?.("Rendering cinematic layers...");
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) { return null; }
};

// Fixed generatePostImage to handle image output part properly from Gemini Flash Image
export const generatePostImage = async (postTitle: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Editorial news graphic for: "${postTitle}". No text, abstract high-quality.`;
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) { return null; }
};
