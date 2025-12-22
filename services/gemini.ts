
import { GoogleGenAI } from "@google/genai";

export const generateSocialCaption = async (postTitle: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, viral social media caption with 3 hashtags for a news post titled: "${postTitle}". Keep it professional yet engaging.`,
    });
    
    return response.text || "Breaking news! Stay tuned for more updates. #news #update #trending";
  } catch (error) {
    console.error('AI Caption Error:', error);
    return `Update: ${postTitle} #news #latest`;
  }
};

/**
 * Generates a professional news-style background image based on post content
 */
export const generatePostImage = async (postTitle: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const prompt = `A professional, high-quality editorial background image representing the news topic: "${postTitle}". Cinematic lighting, abstract architectural or conceptual style suitable for a 1080x1080 news post background. No text in the image.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error('AI Image Generation Error:', error);
    return null;
  }
};
