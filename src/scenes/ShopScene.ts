import Phaser from 'phaser';

export class ShopScene extends Phaser.Scene {
  private currentLevel: number = 1;
  private playerScore: number = 0;

  constructor() {
    super('ShopScene');
  }

  init(data: { level: number, score: number }) {
    // Receive data passed from GameScene
    this.currentLevel = data.level;
    this.playerScore = data.score;
  }

  create() {
    // Background
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x2c3e50);
    this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.3);

    // Shop title
    this.add.text(this.cameras.main.width / 2, 80, 'SHOP', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Outfit',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Level completion text
    this.add.text(this.cameras.main.width / 2, 140, `Level ${this.currentLevel - 1} Complete!`, {
      fontSize: '24px',
      color: '#f1c40f',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    // Score display
    this.add.text(this.cameras.main.width / 2, 170, `Score: ${this.playerScore}`, {
      fontSize: '20px',
      color: '#ecf0f1',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    // Shop content area
    const shopContentArea = this.add.rectangle(this.cameras.main.width / 2, 400, 380, 300, 0x34495e);
    shopContentArea.setStrokeStyle(2, 0x7f8c8d);

    // "Coming Soon" message for now
    this.add.text(this.cameras.main.width / 2, 350, 'Consumables', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Outfit',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(this.cameras.main.width / 2, 400, 'Coming Soon!', {
      fontSize: '20px',
      color: '#95a5a6',
      fontFamily: 'Outfit',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    this.add.text(this.cameras.main.width / 2, 430, 'Powerful items to help you', {
      fontSize: '16px',
      color: '#95a5a6',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    this.add.text(this.cameras.main.width / 2, 450, 'on your word finding journey!', {
      fontSize: '16px',
      color: '#95a5a6',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    // Continue button
    const continueButton = this.add.rectangle(this.cameras.main.width / 2, 620, 200, 50, 0x27ae60);
    continueButton.setStrokeStyle(2, 0x2ecc71);
    
    this.add.text(this.cameras.main.width / 2, 620, 'CONTINUE', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Outfit',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Make button interactive
    continueButton.setInteractive();
    continueButton.on('pointerdown', () => this.continueToNextLevel());
    continueButton.on('pointerover', () => {
      continueButton.setFillStyle(0x2ecc71);
    });
    continueButton.on('pointerout', () => {
      continueButton.setFillStyle(0x27ae60);
    });

    // Skip shop option (smaller button)
    const skipText = this.add.text(this.cameras.main.width / 2, 680, 'Skip Shop', {
      fontSize: '16px',
      color: '#7f8c8d',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    skipText.setInteractive();
    skipText.on('pointerdown', () => this.continueToNextLevel());
    skipText.on('pointerover', () => {
      skipText.setColor('#bdc3c7');
    });
    skipText.on('pointerout', () => {
      skipText.setColor('#7f8c8d');
    });

    // Add some shop framework placeholder elements
    this.createShopFramework();
  }

  private createShopFramework() {
    // This method sets up the framework for future shop items
    // For now, it just creates placeholder slots where items would go

    const itemSlotY = 380;
    const slotWidth = 80;
    const slotHeight = 80;
    const spacing = 100;
    const startX = this.cameras.main.width / 2 - spacing;

    // Create 3 item slots as placeholders
    for (let i = 0; i < 3; i++) {
      const slotX = startX + (i * spacing);
      
      // Item slot background
      const itemSlot = this.add.rectangle(slotX, itemSlotY, slotWidth, slotHeight, 0x2c3e50);
      itemSlot.setStrokeStyle(2, 0x7f8c8d, 0.5);
      
      // Placeholder "?" text
      this.add.text(slotX, itemSlotY, '?', {
        fontSize: '32px',
        color: '#7f8c8d',
        fontFamily: 'Outfit',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }
  }

  private continueToNextLevel() {
    // Return to GameScene and start the next level
    this.scene.start('GameScene', { startLevel: this.currentLevel });
  }
}