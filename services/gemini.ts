
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AIConfig, PerformanceScore, ContentVariations } from "../types";

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_IMAGE = 'gemini-2.5-flash-image';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_VIDEO = 'veo-3.1-fast-generate-preview';

export interface HashtagSet {
  niche: string[];
  broad: string[];
  trending: string[];
}

export const generateHashtags = async (title: string, excerpt: string): Promise<HashtagSet> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Act as a social media SEO expert. Generate 15 highly relevant hashtags for this article.
    Title: "${title}"
    Excerpt: "${excerpt}"
    
    Return a JSON object with exactly these categories:
    - "niche": 5 specific, low-competition tags.
    - "broad": 5 high-volume, general industry tags.
    - "trending": 5 buzzwords related to the topic.
    
    Constraints:
    - Return ONLY the JSON object.
    - No "#" symbol in the string values, just the words.
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
    console.error('Hashtag Generation Error:', error);
    return { niche: ['news'], broad: ['update'], trending: ['trending'] };
  }
};

export const generateSocialCaption = async (
  postTitle: string, 
  excerpt: string, 
  postLink: string, 
  config: AIConfig,
  toneOverride?: string
): Promise<ContentVariations> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const selectedTone = toneOverride || config.brandVoice;
  
  const prompt = `
    Task: Write 4 unique, highly engaging social media captions for this news article.
    Post Title: "${postTitle}"
    Post Excerpt: "${excerpt}"
    Post Link: "${postLink}"
    Voice/Tone: ${selectedTone}
    Include Emojis: ${config.includeEmojis}
    Language: ${config.targetLanguage}
    
    Rules for Variations:
    - Facebook: Conversational, community-focused, includes the link.
    - Instagram: Visual-first descriptions, clear CTA, 5-7 relevant hashtags.
    - Twitter: Punchy, high-impact hooks, under 280 characters, includes the link.
    - LinkedIn: Professional insights, industry context, thought-provoking question at the end, includes the link.
    
    Constraints:
    - Return a JSON object with keys: "Facebook", "Instagram", "Twitter", "LinkedIn".
    - All text must be in ${config.targetLanguage}.
    - Link to include: ${postLink}
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
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error('AI Multi-Caption Error:', error);
    // Explicit Fallback Strategy
    const fallback = `${postTitle}\n\nRead the full story here: ${postLink}`;
    return { 
      Facebook: fallback, 
      Instagram: fallback + "\n\n#news #update", 
      Twitter: `New Post: ${postTitle} ${postLink}`, 
      LinkedIn: `I just published a new update on: ${postTitle}. Check it out here: ${postLink}` 
    };
  }
};

export const predictPerformance = async (title: string, caption: string): Promise<PerformanceScore> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Act as a senior social media data scientist. 
    Predict the engagement potential for this post.
    
    Article Title: "${title}"
    Draft Caption: "${caption}"
    
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
    return { 
      score: 50, 
      label: "Medium", 
      reasoning: ["Simulation fallback active"], 
      suggestions: ["Try adding more engaging hooks or specific hashtags."] 
    };
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
    return base64Audio || null;
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
