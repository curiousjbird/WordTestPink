import Phaser from 'phaser';

export class StartScene extends Phaser.Scene {
  private isSettingsOpen: boolean = false;
  private settingsModal!: Phaser.GameObjects.Container;
  private settings = {
    swipeSensitivity: 0.25
  };

  constructor() {
    super('StartScene');
  }

  create() {
    // Load settings
    this.loadSettings();

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

    // Settings gear icon
    const settingsButton = this.add.text(60, this.cameras.main.height - 60, '⚙️', {
      fontSize: '32px',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    const settingsHitArea = new Phaser.Geom.Rectangle(0, 0, 60, 60);
    settingsButton.setInteractive(settingsHitArea, Phaser.Geom.Rectangle.Contains);
    settingsButton.on('pointerdown', () => this.openSettings());
  }

  private startGame() {
    this.scene.start('GameScene');
  }

  // Settings methods (copied from GameScene)
  private loadSettings() {
    const savedSettings = localStorage.getItem('wordgame-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        this.settings = { ...this.settings, ...parsed };
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    }
  }

  private saveSettings() {
    localStorage.setItem('wordgame-settings', JSON.stringify(this.settings));
  }

  private openSettings() {
    if (this.isSettingsOpen) return;
    this.isSettingsOpen = true;
    this.createSettingsModal();
  }

  private closeSettings() {
    if (!this.isSettingsOpen) return;
    this.isSettingsOpen = false;
    if (this.settingsModal) {
      this.settingsModal.destroy();
    }
  }

  private createSettingsModal() {
    const modalWidth = 400;
    const modalHeight = 300;
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Background overlay
    const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);
    overlay.setOrigin(0);

    // Modal background
    const modalBg = this.add.rectangle(0, 0, modalWidth, modalHeight, 0xffffff);
    modalBg.setStrokeStyle(2, 0x333333);

    // Title
    const title = this.add.text(0, -modalHeight/2 + 40, 'Settings', {
      fontSize: '28px',
      color: '#000000',
      fontFamily: 'Outfit',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Close X button
    const closeX = this.add.text(modalWidth/2 - 20, -modalHeight/2 + 20, '✕', {
      fontSize: '24px',
      color: '#666666',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);
    closeX.setInteractive();
    closeX.on('pointerdown', () => this.closeSettings());

    // Swipe Sensitivity Label
    const sensitivityLabel = this.add.text(0, -60, 'Swipe Sensitivity', {
      fontSize: '20px',
      color: '#000000',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    // Slider track
    const sliderTrackWidth = 250;
    const sliderTrack = this.add.rectangle(0, -20, sliderTrackWidth, 6, 0xcccccc);

    // Slider handle
    const currentValue = (this.settings.swipeSensitivity - 0.05) / (0.75 - 0.05);
    const handleX = (currentValue - 0.5) * sliderTrackWidth;
    const sliderHandle = this.add.circle(handleX, -20, 12, 0x0066cc);
    sliderHandle.setInteractive();
    
    let isDragging = false;
    sliderHandle.on('pointerdown', () => { isDragging = true; });
    this.input.on('pointerup', () => { isDragging = false; });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        const modalWorldPos = this.settingsModal.getWorldTransformMatrix().transformPoint(0, -20);
        const relativeX = pointer.worldX - modalWorldPos.x;
        const clampedX = Phaser.Math.Clamp(relativeX, -sliderTrackWidth/2, sliderTrackWidth/2);
        sliderHandle.x = clampedX;
        
        // Update sensitivity value
        const normalizedValue = (clampedX + sliderTrackWidth/2) / sliderTrackWidth;
        this.settings.swipeSensitivity = 0.05 + normalizedValue * (0.75 - 0.05);
        sensitivityValue.setText(`${(this.settings.swipeSensitivity * 100).toFixed(0)}%`);
      }
    });

    // Sensitivity value display
    const sensitivityValue = this.add.text(0, 20, `${(this.settings.swipeSensitivity * 100).toFixed(0)}%`, {
      fontSize: '16px',
      color: '#666666',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    // Save button
    const saveButton = this.add.rectangle(-80, modalHeight/2 - 40, 100, 40, 0x28a745);
    const saveText = this.add.text(-80, modalHeight/2 - 40, 'Save', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);
    saveButton.setInteractive();
    saveButton.on('pointerdown', () => this.saveSettingsAndClose());

    // Cancel button
    const cancelButton = this.add.rectangle(80, modalHeight/2 - 40, 100, 40, 0x6c757d);
    const cancelText = this.add.text(80, modalHeight/2 - 40, 'Cancel', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);
    cancelButton.setInteractive();
    cancelButton.on('pointerdown', () => this.cancelSettings());

    // Create container
    this.settingsModal = this.add.container(centerX, centerY, [
      overlay, modalBg, title, closeX, sensitivityLabel, 
      sliderTrack, sliderHandle, sensitivityValue,
      saveButton, saveText, cancelButton, cancelText
    ]);
    this.settingsModal.setDepth(1000);
  }

  private saveSettingsAndClose() {
    this.saveSettings();
    this.closeSettings();
  }

  private cancelSettings() {
    // Reload settings to discard changes
    this.loadSettings();
    this.closeSettings();
  }
}