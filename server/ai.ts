import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class AIService {
  private model = "gemini-2.5-flash";

  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      const systemPrompt = `Sen NexaBot adında eğlenceli ve yardımcı bir sohbet botusun. Türkçe konuşuyorsun ve samimi bir tonda cevap veriyorsun. Kısa ve anlaşılır cevaplar ver. Maksimum 200 karakter kullan.${context ? ` İşte sohbet bağlamı: ${context}` : ''}`;

      const response = await ai.models.generateContent({
        model: this.model,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 150,
          temperature: 0.8,
        },
        contents: prompt,
      });

      return response.text || "Üzgünüm, şu anda cevap veremiyorum.";
    } catch (error) {
      console.error("AI Response Error:", error);
      return "AI servisinde bir hata oluştu.";
    }
  }

  async translateText(text: string, targetLang: string = "tr"): Promise<string> {
    try {
      const prompt = `Bu metni ${targetLang === "tr" ? "Türkçe" : "İngilizce"}'ye çevir: "${text}"`;
      
      const response = await ai.models.generateContent({
        model: this.model,
        config: {
          maxOutputTokens: 200,
          temperature: 0.3,
        },
        contents: prompt,
      });

      return response.text || "Çeviri yapılamadı.";
    } catch (error) {
      console.error("Translation Error:", error);
      return "Çeviri servisinde hata oluştu.";
    }
  }

  async explainTopic(topic: string): Promise<string> {
    try {
      const prompt = `"${topic}" konusunu basit ve anlaşılır şekilde 150 kelimeyle açıkla.`;
      
      const response = await ai.models.generateContent({
        model: this.model,
        config: {
          maxOutputTokens: 200,
          temperature: 0.7,
        },
        contents: prompt,
      });

      return response.text || "Bu konu hakkında bilgi bulunamadı.";
    } catch (error) {
      console.error("Explanation Error:", error);
      return "Açıklama servisinde hata oluştu.";
    }
  }

  async generateCreativeContent(type: string, prompt: string): Promise<string> {
    try {
      let systemPrompt = "";
      
      switch (type) {
        case "şiir":
          systemPrompt = "Verilen konuda kısa ve güzel bir şiir yaz.";
          break;
        case "hikaye":
          systemPrompt = "Verilen konuda kısa bir hikaye yaz (maksimum 100 kelime).";
          break;
        case "şarkı":
          systemPrompt = "Verilen konuda kısa bir şarkı sözü yaz.";
          break;
        default:
          systemPrompt = "Verilen konuda yaratıcı bir metin oluştur.";
      }

      const response = await ai.models.generateContent({
        model: this.model,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 200,
          temperature: 0.9,
        },
        contents: prompt,
      });

      return response.text || "Yaratıcı içerik oluşturulamadı.";
    } catch (error) {
      console.error("Creative Content Error:", error);
      return "İçerik üretiminde hata oluştu.";
    }
  }
}

export const aiService = new AIService();