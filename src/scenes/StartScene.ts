import Phaser from 'phaser';
import { SettingsManager } from '../managers/SettingsManager';

export class StartScene extends Phaser.Scene {
  private settingsManager!: SettingsManager;

  constructor() {
    super('StartScene');
  }

  preload() {
    this.load.svg('settingsIcon', 'assets/icons/settings-knobs.svg', { width: 32, height: 32 });
  }

  create() {
    this.settingsManager = new SettingsManager(this, () => {});

    // Title
    this.add.text(this.cameras.main.width / 2, 200, 'Gobblefunk', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'Outfit',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(this.cameras.main.width / 2, 260, 'A Word Discovery Game', {
      fontSize: '20px',
      color: '#cccccc',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    // Play button
    const playButton = this.add.rectangle(this.cameras.main.width / 2, 400, 200, 60, 0xffffff);
    playButton.setStrokeStyle(2, 0xffffff);
    this.add.text(this.cameras.main.width / 2, 400, 'PLAY', {
      fontSize: '24px',
      color: '#000000',
      fontFamily: 'Outfit',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    playButton.setInteractive();
    playButton.on('pointerdown', () => this.startGame());
    playButton.on('pointerover', () => {
      playButton.setFillStyle(0xcccccc);
    });
    playButton.on('pointerout', () => {
      playButton.setFillStyle(0xffffff);
    });

    // Settings icon
    const settingsButton = this.add.image(60, this.cameras.main.height - 60, 'settingsIcon');
    settingsButton.setScale(0.8);
    settingsButton.setTint(0xffffff); // Make it white
    settingsButton.setInteractive();
    settingsButton.on('pointerdown', () => this.settingsManager.openSettings());
  }

  private startGame() {
    this.scene.start('GameScene');
  }
}