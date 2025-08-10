// Global bot manager to prevent duplicate NexaBot creation
class BotManager {
  private static instance: BotManager;
  private botInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  async ensureBotInitialized(createBotFn: () => Promise<void>): Promise<void> {
    if (this.botInitialized) {
      console.log("BotManager: Bot already initialized globally");
      return;
    }

    if (this.initializationPromise) {
      console.log("BotManager: Bot initialization in progress, waiting...");
      await this.initializationPromise;
      return;
    }

    console.log("BotManager: Starting bot initialization");
    this.initializationPromise = this.initializeBot(createBotFn);
    await this.initializationPromise;
  }

  private async initializeBot(createBotFn: () => Promise<void>): Promise<void> {
    try {
      await createBotFn();
      this.botInitialized = true;
      console.log("BotManager: Bot initialization completed successfully");
    } catch (error) {
      console.error("BotManager: Bot initialization failed:", error);
      this.initializationPromise = null; // Reset so it can be retried
      throw error;
    }
  }

  reset(): void {
    this.botInitialized = false;
    this.initializationPromise = null;
    console.log("BotManager: Reset completed");
  }
}

export const botManager = BotManager.getInstance();