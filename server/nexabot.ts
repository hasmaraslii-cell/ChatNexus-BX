import { storage } from "./storage";
import { InsertMessage } from "@shared/schema";

export class NexaBot {
  private botUser: any = null;
  private readonly botId = "nexa-bot-2024";
  private readonly botUsername = "NexaBot";
  private readonly botProfileImage = "https://i.imgur.com/2FDBAwR.png";

  constructor() {
    this.initializeBot();
  }

  private async initializeBot() {
    try {
      // Check if bot already exists
      const existingBot = await storage.getUserByUsername(this.botUsername);
      if (existingBot) {
        this.botUser = existingBot;
        return;
      }

      // Create bot user
      this.botUser = await storage.createUser({
        username: this.botUsername,
        profileImage: this.botProfileImage,
        status: "online",
        isAdmin: false
      });

      console.log("NexaBot initialized successfully");
    } catch (error) {
      console.error("Error initializing NexaBot:", error);
    }
  }

  async processMessage(message: any, roomId: string): Promise<void> {
    if (!message.content || !message.content.startsWith("!")) return;
    if (!this.botUser) await this.initializeBot();

    const content = message.content.trim();
    const args = content.split(" ");
    const command = args[0].toLowerCase();

    try {
      switch (command) {
        case "!yardım":
        case "!help":
          await this.sendHelpMessage(roomId);
          break;
        case "!ara":
          if (args.length > 1) {
            const query = args.slice(1).join(" ");
            await this.searchWeb(query, roomId);
          } else {
            await this.sendMessage("Kullanım: !ara <arama terimi>", roomId);
          }
          break;
        case "!zar":
          await this.rollDice(roomId);
          break;
        case "!yazıtura":
          await this.flipCoin(roomId);
          break;
        case "!şaka":
          await this.tellJoke(roomId);
          break;
        case "!tavsiye":
          await this.giveAdvice(roomId);
          break;
        case "!saat":
          await this.showTime(roomId);
          break;
        case "!bilgi":
          await this.showInfo(roomId);
          break;
        case "!rastgele":
          if (args.length > 2) {
            const min = parseInt(args[1]);
            const max = parseInt(args[2]);
            await this.randomNumber(min, max, roomId);
          } else {
            await this.sendMessage("Kullanım: !rastgele <min> <max>", roomId);
          }
          break;
        case "!komutlar":
          await this.listCommands(roomId);
          break;
        default:
          await this.sendMessage("Bilinmeyen komut! !yardım yazarak tüm komutları görebilirsin.", roomId);
      }
    } catch (error) {
      console.error("Bot command error:", error);
      await this.sendMessage("Bir hata oluştu, lütfen tekrar deneyin.", roomId);
    }
  }

  private async sendMessage(content: string, roomId: string): Promise<void> {
    if (!this.botUser) return;

    const message: InsertMessage = {
      roomId,
      userId: this.botUser.id,
      content,
      messageType: "text"
    };

    await storage.createMessage(message);
  }

  private async sendHelpMessage(roomId: string): Promise<void> {
    const helpText = `🤖 **NexaBot Yardım Menüsü**

**🔍 Arama & Bilgi:**
• !ara <metin> - Web'de arama yap
• !saat - Şu anki saati göster
• !bilgi - Bot hakkında bilgi

**🎲 Eğlence:**
• !zar - 1-6 arası zar at
• !yazıtura - Yazı-tura at
• !şaka - Rastgele şaka anlat
• !tavsiye - Günlük tavsiye ver
• !rastgele <min> <max> - Rastgele sayı üret

**📋 Diğer:**
• !komutlar - Tüm komutları listele
• !yardım - Bu yardım menüsünü göster

Keyifli sohbetler! 💫`;

    await this.sendMessage(helpText, roomId);
  }

  private async searchWeb(query: string, roomId: string): Promise<void> {
    try {
      // Use a free search approach - DuckDuckGo Instant Answer API
      const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`);
      const data = await response.json();

      let resultText = `🔍 **"${query}" için arama sonuçları:**\n\n`;

      if (data.AbstractText) {
        resultText += `📝 **Özet:** ${data.AbstractText}\n`;
        if (data.AbstractURL) {
          resultText += `🔗 **Kaynak:** ${data.AbstractURL}\n\n`;
        }
      }

      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        resultText += `**📚 İlgili Konular:**\n`;
        const topics = data.RelatedTopics.slice(0, 2);
        topics.forEach((topic: any, index: number) => {
          if (topic.Text) {
            resultText += `${index + 1}. ${topic.Text}\n`;
            if (topic.FirstURL) {
              resultText += `   🔗 ${topic.FirstURL}\n\n`;
            }
          }
        });
      }

      if (data.Answer) {
        resultText += `💡 **Hızlı Yanıt:** ${data.Answer}\n`;
      }

      if (data.Definition) {
        resultText += `📖 **Tanım:** ${data.Definition}\n`;
        if (data.DefinitionURL) {
          resultText += `🔗 **Kaynak:** ${data.DefinitionURL}\n`;
        }
      }

      // If no meaningful results, provide a fallback
      if (!data.AbstractText && !data.RelatedTopics?.length && !data.Answer && !data.Definition) {
        resultText += `Maalesef "${query}" için detaylı sonuç bulunamadı.\n\n`;
        resultText += `🌐 **Manuel arama için:**\n`;
        resultText += `• Google: https://www.google.com/search?q=${encodeURIComponent(query)}\n`;
        resultText += `• DuckDuckGo: https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      }

      await this.sendMessage(resultText, roomId);
    } catch (error) {
      console.error("Search error:", error);
      await this.sendMessage(`❌ Arama sırasında hata oluştu. Manuel arama için: https://www.google.com/search?q=${encodeURIComponent(query)}`, roomId);
    }
  }

  private async rollDice(roomId: string): Promise<void> {
    const result = Math.floor(Math.random() * 6) + 1;
    const diceEmojis = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    await this.sendMessage(`🎲 Zar atıldı: ${diceEmojis[result - 1]} **${result}**`, roomId);
  }

  private async flipCoin(roomId: string): Promise<void> {
    const result = Math.random() < 0.5 ? "Yazı" : "Tura";
    const emoji = result === "Yazı" ? "📝" : "🪙";
    await this.sendMessage(`${emoji} Sonuç: **${result}**!`, roomId);
  }

  private async tellJoke(roomId: string): Promise<void> {
    const jokes = [
      "Neden bilgisayarlar soğuk algınlığına yakalanmaz? Çünkü pencereleri açık bırakırlar! 😄",
      "Programcı ne yer? Cookies! 🍪",
      "İnternette en çok hangi hayvan bulunur? Web-site! 🕷️",
      "Neden WiFi şifresi 'incorrect' olmamalı? Çünkü yanlış girdiğinizde 'Password incorrect' diyor! 😂",
      "Bug'ın en büyük düşmanı kimdir? Debugger! 🐛",
      "Neden kodcular karanlık tema kullanır? Çünkü ışık bug'ları çeker! 💡",
      "Başarılı bir programcının sırrı nedir? Stack Overflow! 📚",
      "Neden developerlar kahveyi sever? Çünkü Java içerler! ☕",
    ];
    
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    await this.sendMessage(`😄 ${randomJoke}`, roomId);
  }

  private async giveAdvice(roomId: string): Promise<void> {
    const advice = [
      "💡 Bugün yeni bir şey öğrenmeye çalış!",
      "🌱 Küçük adımlar büyük değişiklikler yaratır.",
      "☕ Mola vermek de işin bir parçasıdır.",
      "🤝 Yardım istemekten çekinme, kimse her şeyi bilemez.",
      "🎯 Hedeflerine odaklan, ama yolculuğun tadını çıkarmayı unutma.",
      "💪 Zorluklar seni güçlendirir, pes etme!",
      "📚 Her gün biraz okumak aklını açar.",
      "🌟 Pozitif düşünmek mucizeler yaratabilir.",
      "🎨 Yaratıcılığını konuştur, farklı bakış açıları dene.",
      "⚡ Enerjini doğru yerde harca, önceliklerini belirle."
    ];
    
    const randomAdvice = advice[Math.floor(Math.random() * advice.length)];
    await this.sendMessage(randomAdvice, roomId);
  }

  private async showTime(roomId: string): Promise<void> {
    const now = new Date();
    const timeString = now.toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    
    await this.sendMessage(`🕐 **Şu anki saat:** ${timeString}`, roomId);
  }

  private async showInfo(roomId: string): Promise<void> {
    const info = `🤖 **NexaBot v1.0**

Merhaba! Ben NexaBot, sizin eğlence ve yardım botunuzum.

**📊 Özelliklerim:**
• Web araması yapabiliyorum
• Eğlenceli oyunlar oynayabilirim
• Günlük tavsiyeler verebilirim
• Zaman bilgisi sağlayabilirim
• Ve daha fazlası!

**🔧 Geliştirici:** IBX Chat Team
**💻 Teknoloji:** Node.js + TypeScript
**🌐 Web:** Ücretsiz DuckDuckGo API

!yardım yazarak tüm komutlarımı görebilirsin! ✨`;

    await this.sendMessage(info, roomId);
  }

  private async randomNumber(min: number, max: number, roomId: string): Promise<void> {
    if (isNaN(min) || isNaN(max)) {
      await this.sendMessage("❌ Lütfen geçerli sayılar girin!", roomId);
      return;
    }

    if (min > max) {
      [min, max] = [max, min]; // Swap values
    }

    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.sendMessage(`🎲 ${min} ile ${max} arasında rastgele sayı: **${result}**`, roomId);
  }

  private async listCommands(roomId: string): Promise<void> {
    const commands = `📋 **Tüm NexaBot Komutları:**

**🔍 Arama & Bilgi:**
• !ara <metin> • !saat • !bilgi

**🎲 Eğlence:**
• !zar • !yazıtura • !şaka • !tavsiye • !rastgele <min> <max>

**📋 Yardım:**
• !komutlar • !yardım

Komutları ! işareti ile başlatmayı unutma! 🚀`;

    await this.sendMessage(commands, roomId);
  }
}

export const nexaBot = new NexaBot();