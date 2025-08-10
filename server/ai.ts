import { GoogleGenerativeAI } from "@google/genai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

class AIService {
  private model = "gemini-1.5-flash";

  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      const systemPrompt = `Sen NexaBot adında eğlenceli ve yardımcı bir sohbet botusun. Türkçe konuşuyorsun ve samimi bir tonda cevap veriyorsun. Kısa ve anlaşılır cevaplar ver. Maksimum 200 karakter kullan. Kullanıcılara her zaman ismiyle hitap et.${context ? ` İşte sohbet bağlamı: ${context}` : ''}`;

      const model = genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(`${systemPrompt}\n\nSoru: ${prompt}`);
      const response = await result.response;

      return response.text() || "Üzgünüm, şu anda cevap veremiyorum.";
    } catch (error) {
      console.error("AI Response Error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return `💬 AI servisi hatası: ${JSON.stringify(error, null, 2)}`;
    }
  }

  async translateText(text: string, targetLang: string = "tr"): Promise<string> {
    try {
      const prompt = `Bu metni ${targetLang === "tr" ? "Türkçe" : "İngilizce"}'ye çevir: "${text}"`;
      
      const model = genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(prompt);
      const response = await result.response;

      return response.text() || "Çeviri yapılamadı.";
    } catch (error) {
      console.error("Translation Error:", error);
      return "Çeviri servisinde hata oluştu.";
    }
  }

  async explainTopic(topic: string): Promise<string> {
    try {
      const prompt = `"${topic}" konusunu basit ve anlaşılır şekilde 150 kelimeyle açıkla.`;
      
      const model = genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(prompt);
      const response = await result.response;

      return response.text() || "Bu konu hakkında bilgi bulunamadı.";
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

      const model = genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
      const response = await result.response;

      return response.text() || "Yaratıcı içerik oluşturulamadı.";
    } catch (error) {
      console.error("Creative Content Error:", error);
      return "İçerik üretiminde hata oluştu.";
    }
  }
}

export const aiService = new AIService();