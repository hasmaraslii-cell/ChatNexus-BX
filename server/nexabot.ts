import { storage } from "./storage";
import { InsertMessage } from "@shared/schema";
import { aiService } from "./ai";

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
    if (!message.content) return;
    if (!this.botUser) await this.initializeBot();

    const content = message.content.trim();
    
    // Check for profanity filter
    if (this.containsProfanity(content)) {
      await this.sendMessage("⚠️ Lütfen nezaket kurallarına uygun mesajlar yazın.", roomId);
      return;
    }

    // Check if bot is mentioned (case insensitive, handle spaces in names)
    const normalizedContent = content.toLowerCase();
    const botMentions = ['nexabot', 'nexa bot', '@nexabot', '@nexa bot', 'nexa', 'nexa yapay zeka'];
    const isMentioned = botMentions.some(mention => normalizedContent.includes(mention));
    
    if (isMentioned && !content.startsWith("!")) {
      // Remove mention from message and respond with AI
      let cleanMessage = content;
      botMentions.forEach(mention => {
        const regex = new RegExp(mention, 'gi');
        cleanMessage = cleanMessage.replace(regex, '').trim();
      });
      
      if (cleanMessage.length > 0) {
        await this.chatWithAI(cleanMessage, roomId);
      } else {
        await this.sendMessage("🤖 Merhaba! Size nasıl yardımcı olabilirim? !yardım yazarak komutları görebilirsiniz.", roomId);
      }
      return;
    }

    // Process commands
    if (!content.startsWith("!")) return;
    
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
            await this.searchWithAI(query, roomId);
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
        case "!hava":
          if (args.length > 1) {
            const city = args.slice(1).join(" ");
            await this.getWeather(city, roomId);
          } else {
            await this.sendMessage("Kullanım: !hava <şehir adı>", roomId);
          }
          break;
        case "!kelime":
          await this.generateRandomWord(roomId);
          break;
        case "!renk":
          await this.generateRandomColor(roomId);
          break;
        case "!emoji":
          await this.sendRandomEmoji(roomId);
          break;
        case "!gerçek":
          await this.tellFact(roomId);
          break;
        case "!soru":
          await this.askThoughtQuestion(roomId);
          break;
        case "!tahmin":
          await this.startGuessingGame(roomId);
          break;
        case "!kelimeoyunu":
          await this.startWordGame(roomId);
          break;
        case "!matematik":
          await this.generateMathProblem(roomId);
          break;
        case "!ai":
        case "!sor":
          if (args.length > 1) {
            const question = args.slice(1).join(" ");
            await this.askAI(question, roomId);
          } else {
            await this.sendMessage("Kullanım: !ai <sorunuz> veya !sor <sorunuz>", roomId);
          }
          break;
        case "!çevir":
          if (args.length > 1) {
            const text = args.slice(1).join(" ");
            await this.translateText(text, roomId);
          } else {
            await this.sendMessage("Kullanım: !çevir <çevrilecek metin>", roomId);
          }
          break;
        case "!açıkla":
          if (args.length > 1) {
            const topic = args.slice(1).join(" ");
            await this.explainTopic(topic, roomId);
          } else {
            await this.sendMessage("Kullanım: !açıkla <konu>", roomId);
          }
          break;
        case "!şiir":
          if (args.length > 1) {
            const topic = args.slice(1).join(" ");
            await this.generateCreativeContent("şiir", topic, roomId);
          } else {
            await this.sendMessage("Kullanım: !şiir <konu>", roomId);
          }
          break;
        case "!hikaye":
          if (args.length > 1) {
            const topic = args.slice(1).join(" ");
            await this.generateCreativeContent("hikaye", topic, roomId);
          } else {
            await this.sendMessage("Kullanım: !hikaye <konu>", roomId);
          }
          break;
        case "!sohbet":
          if (args.length > 1) {
            const message = args.slice(1).join(" ");
            await this.chatWithAI(message, roomId);
          } else {
            await this.sendMessage("Kullanım: !sohbet <mesajınız> - Benimle doğal sohbet edin!", roomId);
          }
          break;

        default:
          // Eğer komut ! ile başlıyorsa ve bilinmiyorsa, AI'ya sor
          if (content.startsWith("!")) {
            await this.sendMessage("Bilinmeyen komut! !yardım yazarak tüm komutları görebilirsin.", roomId);
          }
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
• !hava <şehir> - Hava durumu öğren

**🤖 Yapay Zeka:**
• !ai <soru> - AI'ya soru sor
• !sor <soru> - AI'dan yardım iste
• !sohbet <mesaj> - Doğal sohbet et
• !çevir <metin> - Metni çevir
• !açıkla <konu> - Bir konuyu açıklat
• !şiir <konu> - Şiir yazdır
• !hikaye <konu> - Hikaye oluştur

**🎲 Eğlence:**
• !zar - 1-6 arası zar at
• !yazıtura - Yazı-tura at
• !şaka - Rastgele şaka anlat
• !tavsiye - Günlük tavsiye ver
• !rastgele <min> <max> - Rastgele sayı üret
• !kelime - Rastgele kelime üret
• !renk - Rastgele renk kodu ver
• !emoji - Rastgele emoji gönder
• !gerçek - İlginç gerçek anlat
• !soru - Düşündürücü soru sor

**🎮 Oyunlar:**
• !tahmin - 1-100 arası sayı tahmin oyunu
• !kelimeoyunu - Kelime bulma oyunu
• !matematik - Matematik sorusu

**📋 Diğer:**
• !komutlar - Tüm komutları listele
• !yardım - Bu yardım menüsünü göster

Keyifli sohbetler! 💫`;

    await this.sendMessage(helpText, roomId);
  }

  private async searchWeb(query: string, roomId: string): Promise<void> {
    try {
      await this.sendMessage(`🔍 **"${query}" aranıyor...** 🤖

Lütfen bekleyin, arama sonuçlarını getiriyorum...`, roomId);

      // Try multiple DuckDuckGo approaches
      let resultText = `🔍 **"${query}" için arama sonuçları:**

`;
      let hasResults = false;

      // Method 1: DuckDuckGo Instant Answers API
      try {
        const duckResponse = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`);
        const data = await duckResponse.json();

        if (data.AbstractText) {
          resultText += `📝 **Özet:** ${data.AbstractText}
`;
          hasResults = true;
          if (data.AbstractURL) {
            resultText += `🔗 **Kaynak:** [Daha fazla bilgi](${data.AbstractURL})

`;
          }
        }

        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
          resultText += `**📚 İlgili Konular:**
`;
          const topics = data.RelatedTopics.slice(0, 3);
          topics.forEach((topic: any, index: number) => {
            if (topic.Text) {
              resultText += `${index + 1}. ${topic.Text}
`;
              hasResults = true;
              if (topic.FirstURL) {
                resultText += `   🔗 [Detaylar](${topic.FirstURL})

`;
              }
            }
          });
        }

        if (data.Answer) {
          resultText += `💡 **Hızlı Yanıt:** ${data.Answer}
`;
          hasResults = true;
        }

        if (data.Definition) {
          resultText += `📖 **Tanım:** ${data.Definition}
`;
          hasResults = true;
          if (data.DefinitionURL) {
            resultText += `🔗 **Kaynak:** [Sözlük](${data.DefinitionURL})
`;
          }
        }

        if (data.Infobox && data.Infobox.content && data.Infobox.content.length > 0) {
          resultText += `**ℹ️ Bilgi Kutusu:**
`;
          data.Infobox.content.slice(0, 3).forEach((info: any) => {
            if (info.label && info.value) {
              resultText += `• **${info.label}:** ${info.value}
`;
              hasResults = true;
            }
          });
          resultText += `
`;
        }
      } catch (err) {
        console.log("DuckDuckGo API error:", err);
      }

      // Method 2: Try Wikipedia API as fallback
      if (!hasResults) {
        try {
          const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.split(' ').join('_'))}`);
          if (wikiResponse.ok) {
            const wikiData = await wikiResponse.json();
            if (wikiData.extract) {
              resultText += `📚 **Wikipedia'dan:** ${wikiData.extract}

🔗 **Kaynak:** [Wikipedia](${wikiData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`})

`;
              hasResults = true;
            }
          }
        } catch (err) {
          console.log("Wikipedia API error:", err);
        }
      }

      // If still no results, provide helpful manual search links
      if (!hasResults) {
        resultText += `Üzgünüm, "${query}" için otomatik arama sonucu bulunamadı.

🌐 **Manuel arama yapabileceğin siteler:**
• [Google'da "${query}" ara](https://www.google.com/search?q=${encodeURIComponent(query)})
• [DuckDuckGo'da "${query}" ara](https://duckduckgo.com/?q=${encodeURIComponent(query)})
• [Bing'de "${query}" ara](https://www.bing.com/search?q=${encodeURIComponent(query)})
• [Wikipedia'da "${query}" ara](https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)})

**💡 İpucu:** Daha spesifik kelimeler kullanarak tekrar dene!`;
      } else {
        resultText += `**🌐 Daha fazla arama:**
• [Google'da ara](https://www.google.com/search?q=${encodeURIComponent(query)})
• [DuckDuckGo'da ara](https://duckduckgo.com/?q=${encodeURIComponent(query)})`;
      }

      await this.sendMessage(resultText, roomId);
    } catch (error) {
      console.error("Search error:", error);
      await this.sendMessage(`❌ Arama sırasında hata oluştu.

**🌐 Manuel arama linkleri:**
• [Google'da "${query}" ara](https://www.google.com/search?q=${encodeURIComponent(query)})
• [DuckDuckGo'da "${query}" ara](https://duckduckgo.com/?q=${encodeURIComponent(query)})
• [Wikipedia'da "${query}" ara](https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)})

Lütfen manuel olarak arama yapmayı dene! 🔍`, roomId);
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

  private async getWeather(city: string, roomId: string): Promise<void> {
    // Mock weather data since we don't have a weather API key
    const conditions = ["☀️ Güneşli", "⛅ Parçalı bulutlu", "☁️ Bulutlu", "🌧️ Yağmurlu", "⛈️ Fırtınalı", "🌨️ Karlı"];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const temp = Math.floor(Math.random() * 30) + 5; // 5-35°C
    
    await this.sendMessage(`🌡️ **${city} Hava Durumu**

${condition}
🌡️ Sıcaklık: ${temp}°C
💨 Rüzgar: ${Math.floor(Math.random() * 20 + 5)} km/h

*Not: Gerçek hava durumu için [Weather.com](https://weather.com) ziyaret edin.*`, roomId);
  }

  private async generateRandomWord(roomId: string): Promise<void> {
    const words = [
      "macera", "kahraman", "bulut", "deniz", "yıldız", "kitap", "müzik", "rüya", 
      "umut", "sevgi", "barış", "özgürlük", "dostluk", "mutluluk", "cesaret",
      "hayal", "merak", "sabır", "güven", "şefkat", "yaratıcılık", "bilgelik"
    ];
    
    const word = words[Math.floor(Math.random() * words.length)];
    await this.sendMessage(`📝 **Rastgele Kelime:** ${word}

Bu kelimeyle cümle kurmaya ne dersin? 💭`, roomId);
  }

  private async generateRandomColor(roomId: string): Promise<void> {
    const colors = [
      { name: "Kırmızı", hex: "#FF0000" },
      { name: "Mavi", hex: "#0000FF" },
      { name: "Yeşil", hex: "#00FF00" },
      { name: "Sarı", hex: "#FFFF00" },
      { name: "Mor", hex: "#800080" },
      { name: "Turuncu", hex: "#FFA500" },
      { name: "Pembe", hex: "#FFC0CB" },
      { name: "Turkuaz", hex: "#40E0D0" }
    ];
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    await this.sendMessage(`🎨 **Rastgele Renk:** ${color.name}

**Hex Kodu:** ${color.hex}
**RGB:** ${parseInt(color.hex.slice(1,3), 16)}, ${parseInt(color.hex.slice(3,5), 16)}, ${parseInt(color.hex.slice(5,7), 16)}

Bu rengi kullanan bir tasarım yap! 🖌️`, roomId);
  }

  private async sendRandomEmoji(roomId: string): Promise<void> {
    const emojis = ["🎉", "🌟", "💫", "🦋", "🌈", "🎭", "🎪", "🎨", "🎯", "🚀", "⚡", "🔥", "💎", "🌺", "🌸"];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    await this.sendMessage(`${emoji} **Rastgele Emoji:** ${emoji}

Bu emoji nasıl hissettiriyor seni? 😊`, roomId);
  }

  private async tellFact(roomId: string): Promise<void> {
    const facts = [
      "Bal hiçbir zaman bozulmaz! Arkeologlar 3000 yıllık yenilebilir bal bulmuşlar.",
      "Ahtapotların üç kalbi var ve mavimsi kanları var.",
      "Bananaların %96'sı su içerir.",
      "Karıncalar asla uyumaz, sadece kısa molalar verir.",
      "Bir insanın beyni günde yaklaşık 70.000 düşünce üretir.",
      "Köpekbalıkları ağaçlardan daha eski canlılardır.",
      "Flamingolar pembe renkte doğmaz, yedikleri yiyecekler onları pembe yapar.",
      "Bir günde göz kırpmalarımızın sayısı yaklaşık 17.000'dir.",
    ];
    
    const fact = facts[Math.floor(Math.random() * facts.length)];
    await this.sendMessage(`🧠 **İlginç Gerçek:**

${fact}

Bunu biliyor muydun? 🤔`, roomId);
  }

  private async askThoughtQuestion(roomId: string): Promise<void> {
    const questions = [
      "Eğer geçmişe gidip bir şeyi değiştirebilseydin, ne olurdu?",
      "Hangi süper gücün olmasını isterdin ve neden?",
      "Eğer sadece 3 kelimeyle kendini tanımlayabilseydin, hangileri olurdu?",
      "Hayatındaki en büyük hedefin nedir?",
      "Eğer 1 milyon doların olsa ilk ne yapardın?",
      "Hangi ünlü kişiyle bir gün geçirmek istersin?",
      "Eğer bir kitap yazsan konusu ne olurdu?",
      "Hayatında en çok neye minnettarsın?",
    ];
    
    const question = questions[Math.floor(Math.random() * questions.length)];
    await this.sendMessage(`🤔 **Düşündürücü Soru:**

${question}

Cevabını merak ediyorum! 💭`, roomId);
  }

  private async startGuessingGame(roomId: string): Promise<void> {
    const number = Math.floor(Math.random() * 100) + 1;
    await this.sendMessage(`🎯 **Sayı Tahmin Oyunu!**

1 ile 100 arasında bir sayı tuttum!
Tahminini yaz ve görelim ne kadar yakınsın! 🎲

**İpucu:** Sayım ${number > 50 ? "50'den büyük" : "50'den küçük"}! 

*Not: Bu basit bir versiyonu, gelecekte daha gelişmiş oyunlar eklenecek!*`, roomId);
  }

  private async startWordGame(roomId: string): Promise<void> {
    const words = [
      { word: "E_E_TRON_K", answer: "ELEKTRONİK", hint: "Teknoloji ile ilgili" },
      { word: "B_LG_SAY_R", answer: "BİLGİSAYAR", hint: "Çalışmak için kullanılan cihaz" },
      { word: "MÜ_İK", answer: "MÜZİK", hint: "Kulakla dinlenen sanat" },
      { word: "K_T_P", answer: "KİTAP", hint: "Okumak için kullanılan nesne" },
    ];
    
    const puzzle = words[Math.floor(Math.random() * words.length)];
    await this.sendMessage(`📝 **Kelime Oyunu!**

**Eksik harfleri tamamla:** ${puzzle.word}
**İpucu:** ${puzzle.hint}

Cevabını tahmin et! 🧩

*Cevap: ${puzzle.answer}* (Bu sadece örnek, gerçek oyunda gizli olacak!)`, roomId);
  }

  private async generateMathProblem(roomId: string): Promise<void> {
    const operations = ["+", "-", "×"];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1: number, num2: number, answer: number;
    
    if (operation === "+") {
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      answer = num1 + num2;
    } else if (operation === "-") {
      num1 = Math.floor(Math.random() * 100) + 50;
      num2 = Math.floor(Math.random() * 50) + 1;
      answer = num1 - num2;
    } else {
      num1 = Math.floor(Math.random() * 12) + 1;
      num2 = Math.floor(Math.random() * 12) + 1;
      answer = num1 * num2;
    }
    
    await this.sendMessage(`🧮 **Matematik Sorusu:**

**${num1} ${operation} ${num2} = ?**

Cevabını yazabilirsin! 📐

*Cevap: ${answer}* 🎯`, roomId);
  }

  private async listCommands(roomId: string): Promise<void> {
    const commands = `📋 **Tüm NexaBot Komutları:**

**🤖 AI Özellikleri:**
• !ai <soru> • !sor <soru> • !sohbet <mesaj> • !çevir <metin>
• !açıkla <konu> • !şiir <konu> • !hikaye <konu>

**🔍 Arama & Bilgi:**
• !ara <metin> • !saat • !bilgi • !hava <şehir>

**🎲 Eğlence:**
• !zar • !yazıtura • !şaka • !tavsiye • !rastgele <min> <max>
• !kelime • !renk • !emoji • !gerçek • !soru

**🎮 Oyunlar:**
• !tahmin • !kelimeoyunu • !matematik

**📋 Yardım:**
• !komutlar • !yardım

Komutları ! işareti ile başlatmayı unutma! 🚀`;

    await this.sendMessage(commands, roomId);
  }

  // AI Functions
  private async askAI(question: string, roomId: string): Promise<void> {
    try {
      await this.sendMessage("🤖 AI düşünüyor, lütfen bekleyin...", roomId);
      
      const response = await aiService.generateResponse(question);
      await this.sendMessage(`🧠 **AI Cevabı:**

${response}`, roomId);
    } catch (error) {
      console.error("AI Question Error:", error);
      await this.sendMessage("AI servisi şu anda yanıt veremiyor. Lütfen daha sonra tekrar deneyin.", roomId);
    }
  }

  private async chatWithAI(message: string, roomId: string): Promise<void> {
    try {
      const response = await aiService.generateResponse(message, "Dostane bir sohbet yapıyorsunuz.");
      await this.sendMessage(`💬 ${response}`, roomId);
    } catch (error) {
      console.error("AI Chat Error:", error);
      await this.sendMessage("Şu anda sohbet edemiyorum. Lütfen daha sonra tekrar deneyin.", roomId);
    }
  }

  private async translateText(text: string, roomId: string): Promise<void> {
    try {
      await this.sendMessage("🌐 Çeviri yapılıyor...", roomId);
      
      // Detect if text is Turkish or English and translate accordingly
      const isTurkish = /[çğıöşüÇĞIÖŞÜ]/.test(text);
      const targetLang = isTurkish ? "en" : "tr";
      
      const translation = await aiService.translateText(text, targetLang);
      await this.sendMessage(`🔄 **Çeviri:**

**Orijinal:** ${text}
**Çeviri:** ${translation}`, roomId);
    } catch (error) {
      console.error("Translation Error:", error);
      await this.sendMessage("Çeviri yapılamadı. Lütfen daha sonra tekrar deneyin.", roomId);
    }
  }

  private async explainTopic(topic: string, roomId: string): Promise<void> {
    try {
      await this.sendMessage("📚 Konu açıklanıyor...", roomId);
      
      const explanation = await aiService.explainTopic(topic);
      await this.sendMessage(`📖 **"${topic}" Açıklaması:**

${explanation}`, roomId);
    } catch (error) {
      console.error("Explanation Error:", error);
      await this.sendMessage("Konu açıklanamadı. Lütfen daha sonra tekrar deneyin.", roomId);
    }
  }

  private async generateCreativeContent(type: string, topic: string, roomId: string): Promise<void> {
    try {
      const typeEmoji = type === "şiir" ? "📝" : "📚";
      const typeText = type === "şiir" ? "Şiir" : "Hikaye";
      
      await this.sendMessage(`${typeEmoji} ${typeText} yazılıyor...`, roomId);
      
      const content = await aiService.generateCreativeContent(type, topic);
      await this.sendMessage(`${typeEmoji} **${topic} - ${typeText}:**

${content}`, roomId);
    } catch (error) {
      console.error("Creative Content Error:", error);
      await this.sendMessage("İçerik oluşturulamadı. Lütfen daha sonra tekrar deneyin.", roomId);
    }
  }

  private containsProfanity(text: string): boolean {
    const profanityWords = [
      'amk', 'amq', 'oç', 'aq', 'mk', 'salak', 'aptal', 'gerizekalı', 
      'mal', 'köpek', 'it', 'pislik', 'kaka', 'boktan', 'saçma',
      'fuck', 'shit', 'damn', 'bitch', 'ass', 'hell', 'stupid', 'idiot'
    ];
    
    const normalizedText = text.toLowerCase()
      .replace(/[^a-züığıöşç]/g, ' ')
      .split(' ')
      .filter(word => word.length > 0);
    
    return profanityWords.some(profanity => 
      normalizedText.some(word => 
        word.includes(profanity) || profanity.includes(word)
      )
    );
  }

  private async searchWithAI(query: string, roomId: string): Promise<void> {
    try {
      await this.sendMessage(`🔍 **"${query}" aranıyor...** 🤖
      
AI ile gelişmiş arama yapılıyor...`, roomId);

      const searchPrompt = `"${query}" hakkında detaylı ve güncel bilgi ver. Konuyla ilgili önemli noktaları, tanımları ve ilginç bilgileri içeren kapsamlı bir açıklama yap. Maksimum 400 kelime kullan.`;
      
      const aiResponse = await aiService.generateResponse(searchPrompt);
      
      await this.sendMessage(`🔍 **"${query}" için AI Arama Sonucu:**

${aiResponse}

💡 *Bu bilgiler AI tarafından sağlanmıştır. Daha detaylı bilgi için güvenilir kaynaklari kontrol edin.*`, roomId);

    } catch (error) {
      console.error("AI Search Error:", error);
      // Fallback to original web search if AI fails
      await this.searchWeb(query, roomId);
    }
  }


}

export const nexaBot = new NexaBot();