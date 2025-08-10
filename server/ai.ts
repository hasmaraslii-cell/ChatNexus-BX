class AIService {
  async generateResponse(prompt: string, context?: string): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return "AI özelliği şu anda mevcut değil (API anahtarı eksik).";
      }

      // Use fetch to call Google AI directly
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Sen NexaBot adında eğlenceli ve yardımcı bir sohbet botusun. Türkçe konuşuyorsun ve samimi bir tonda cevap veriyorsun. Kısa ve anlaşılır cevaplar ver. Maksimum 200 karakter kullan. Kullanıcılara her zaman ismiyle hitap et.${context ? ` İşte sohbet bağlamı: ${context}` : ''}\n\nSoru: ${prompt}`
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text || "Üzgünüm, şu anda cevap veremiyorum.";
      }
      
      return "Üzgünüm, şu anda cevap veremiyorum.";
    } catch (error) {
      console.error("AI Response Error:", error);
      return "AI servisi şu anda yanıt veremiyor. Lütfen daha sonra tekrar deneyin.";
    }
  }

  async translateText(text: string, targetLang: string = "tr"): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return "Çeviri özelliği şu anda mevcut değil.";
      }

      const prompt = `Bu metni ${targetLang === "tr" ? "Türkçe" : "İngilizce"}'ye çevir: "${text}"`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text || "Çeviri yapılamadı.";
      }

      return "Çeviri yapılamadı.";
    } catch (error) {
      console.error("Translation Error:", error);
      return "Çeviri servisinde hata oluştu.";
    }
  }

  async explainTopic(topic: string): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return "Açıklama özelliği şu anda mevcut değil.";
      }

      const prompt = `"${topic}" konusunu basit ve anlaşılır şekilde 150 kelimeyle açıkla.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text || "Bu konu hakkında bilgi bulunamadı.";
      }

      return "Bu konu hakkında bilgi bulunamadı.";
    } catch (error) {
      console.error("Explanation Error:", error);
      return "Açıklama servisinde hata oluştu.";
    }
  }

  async generateCreativeContent(type: string, prompt: string): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return "Yaratıcı içerik özelliği şu anda mevcut değil.";
      }

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

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text || "Yaratıcı içerik oluşturulamadı.";
      }

      return "Yaratıcı içerik oluşturulamadı.";
    } catch (error) {
      console.error("Creative Content Error:", error);
      return "İçerik üretiminde hata oluştu.";
    }
  }
}

export const aiService = new AIService();