
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AIConfig, PerformanceScore, ContentVariations } from "../types";

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_IMAGE = 'gemini-2.5-flash-image';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_VIDEO = 'veo-3.1-fast-generate-preview';

export const generateSocialCaption = async (postTitle: string, excerpt: string, postLink: string, config: AIConfig): Promise<ContentVariations> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Task: Write 4 unique social media captions for this news post.
    Post Title: "${postTitle}"
    Post Excerpt: "${excerpt}"
    Post Link: "${postLink}"
    Voice: ${config.brandVoice}
    Include Emojis: ${config.includeEmojis}
    Language: ${config.targetLanguage}
    
    Return a JSON object with keys: "Facebook", "Instagram", "Twitter", "LinkedIn".
    - Twitter should be under 280 chars with hooks and the link.
    - Instagram should have 5-7 hashtags and mention the link in bio or use the link directly if appropriate.
    - LinkedIn should be professional and thought-provoking, including the link.
    - Facebook should be engaging and conversation-starting, including the link.
    - Translate all content to ${config.targetLanguage}.
    - ALWAYS include the post link: ${postLink} in the captions.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        temperature: config.creativity,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            Facebook: { type: Type.STRING },
            Instagram: { type: Type.STRING },
            Twitter: { type: Type.STRING },
            LinkedIn: { type: Type.STRING }
          },
          required: ["Facebook", "Instagram", "Twitter", "LinkedIn"]
        },
        tools: config.useGrounding ? [{ googleSearch: {} }] : undefined
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error('AI Multi-Caption Error:', error);
    const fallback = `News Update: ${postTitle} - Read more: ${postLink}`;
    return { Facebook: fallback, Instagram: fallback, Twitter: fallback, LinkedIn: fallback };
  }
};

export const predictPerformance = async (title: string, caption: string): Promise<PerformanceScore> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Act as a high-level social media strategist. 
    Analyze this post for potential viral engagement.
    Title: "${title}"
    Caption: "${caption}"
    
    Return a JSON object:
    {
      "score": number (0-100),
      "label": "Low" | "Medium" | "High" | "Viral Potential",
      "reasoning": string[],
      "suggestions": string[]
    }
  `;

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
    return { score: 70, label: "Medium", reasoning: ["Standard performance"], suggestions: ["Add a CTA"] };
  }
};

export const generateAudioBrief = async (text: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text: `Read this news brief in a professional reporter style: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
    return null;
  } catch (error) {
    console.error('TTS Error:', error);
    return null;
  }
};

export const generateVideoTeaser = async (prompt: string, onProgress?: (msg: string) => void): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    onProgress?.("Initiating video generation...");
    let operation = await ai.models.generateVideos({
      model: MODEL_VIDEO,
      prompt: `Cinematic news teaser video for: ${prompt}. High quality, slow motion, 4k editorial style.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      onProgress?.("Dreaming up your teaser... This takes about a minute.");
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Video Gen Error:', error);
    return null;
  }
};

export const refineImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: 'image/png'
            }
          },
          { text: `Modify this image: ${prompt}` }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const generatePostImage = async (postTitle: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `Professional news graphic background for: "${postTitle}". Editorial style, no text.`;
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};
