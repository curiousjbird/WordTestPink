import Phaser from 'phaser';
import { GameStateManager } from './GameStateManager';
import { LetterTile } from './GridManager';

export class UIManager {
    private scene: Phaser.Scene;
    private gameStateManager: GameStateManager;

    private levelText!: Phaser.GameObjects.Text;
    private goalText!: Phaser.GameObjects.Text;
    private scoreText!: Phaser.GameObjects.Text;
    private feedbackText!: Phaser.GameObjects.Text;
    private slidingPanel!: Phaser.GameObjects.Container;
    private isPanelOpen: boolean = false;
    private panelWidth: number = 0;

    constructor(scene: Phaser.Scene, gameStateManager: GameStateManager) {
        this.scene = scene;
        this.gameStateManager = gameStateManager;
        this.panelWidth = this.scene.cameras.main.width * 0.75;
    }

    public createUI(onRotate: () => void, onToggleWordsPanel: () => void, onOpenSettings: () => void) {
        this.levelText = this.scene.add.text(10, 10, '', { fontSize: '24px', color: '#ffffff', fontFamily: 'Outfit' });
        this.goalText = this.scene.add.text(10, 40, '', { fontSize: '24px', color: '#ffffff', fontFamily: 'Outfit' });
        this.scoreText = this.scene.add.text(10, 70, '', { fontSize: '24px', color: '#ffffff', fontFamily: 'Outfit' });

        this.feedbackText = this.scene.add.text(this.scene.cameras.main.width / 2, 120, '', {
            fontSize: '24px', color: '#ff0000', fontFamily: 'Outfit'
        }).setOrigin(0.5);

        const rotateButton = this.scene.add.image(this.scene.cameras.main.width / 2, this.scene.cameras.main.height - 120, 'rotateIcon');
        rotateButton.setScale(0.8).setTint(0xffffff).setInteractive().on('pointerdown', onRotate);

        const bookmarkIcon = this.scene.add.image(this.scene.cameras.main.width / 2, this.scene.cameras.main.height - 180, 'bookmarkIcon');
        bookmarkIcon.setScale(0.8).setTint(0xffffff).setInteractive().on('pointerdown', onToggleWordsPanel);

        const settingsButton = this.scene.add.image(60, this.scene.cameras.main.height - 60, 'settingsIcon');
        settingsButton.setScale(0.8).setTint(0xffffff).setInteractive().on('pointerdown', onOpenSettings);
    }

    public updateUI() {
        this.levelText.setText(`Level: ${this.gameStateManager.level}`);
        this.goalText.setText(`Goal: ${this.gameStateManager.goal}`);
        this.scoreText.setText(`Score: ${this.gameStateManager.score}`);
    }

    public flashTiles(tiles: LetterTile[], color: number, onComplete: () => void, stay: boolean = false) {
        let completedTweens = 0;
        tiles.forEach(tile => {
            this.scene.tweens.add({
                targets: tile.background,
                scaleX: 1.2,
                scaleY: 1.2,
                yoyo: true,
                duration: 200,
                ease: 'Power2',
                onStart: () => tile.background.setFillStyle(color),
                onComplete: () => {
                    tile.background.scale = 1;
                    if (++completedTweens === tiles.length) {
                        if (!stay) {
                            this.scene.time.delayedCall(300, onComplete);
                        } else {
                            onComplete();
                        }
                    }
                }
            });
        });
    }

    public showLevelCompletePopup(onShop: () => void) {
        const modalWidth = 400;
        const modalHeight = 250;
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;

        const overlay = this.scene.add.rectangle(-centerX, -centerY, this.scene.cameras.main.width, this.scene.cameras.main.height, 0x000000, 0.7);
        const modalBg = this.scene.add.rectangle(0, 0, modalWidth, modalHeight, 0xffffff).setStrokeStyle(2, 0x00ff00);
        const title = this.scene.add.text(0, -modalHeight/2 + 40, `You beat level ${this.gameStateManager.level}!`, { fontSize: '24px', color: '#000000', fontFamily: 'Outfit', fontStyle: 'bold' }).setOrigin(0.5);
        const scoreText = this.scene.add.text(0, -20, `with a score of ${this.gameStateManager.score}`, { fontSize: '20px', color: '#333333', fontFamily: 'Outfit' }).setOrigin(0.5);
        const questionText = this.scene.add.text(0, 20, 'Visit the shop before next level?', { fontSize: '18px', color: '#333333', fontFamily: 'Outfit' }).setOrigin(0.5);

        const shopButton = this.scene.add.rectangle(0, modalHeight/2 - 40, 120, 40, 0x28a745);
        const shopText = this.scene.add.text(0, modalHeight/2 - 40, 'SHOP', { fontSize: '18px', color: '#ffffff', fontFamily: 'Outfit' }).setOrigin(0.5);

        const shopButtonContainer = this.scene.add.container(0, 0, [shopButton, shopText]).setInteractive(new Phaser.Geom.Rectangle(-60, -20, 120, 40), Phaser.Geom.Rectangle.Contains);
        shopButtonContainer.on('pointerdown', onShop);

        const popup = this.scene.add.container(centerX, centerY, [overlay, modalBg, title, scoreText, questionText, shopButtonContainer]);
        popup.setDepth(1000);
    }

    public toggleWordsPanel() {
        if (this.isPanelOpen) {
            this.closeSlidingPanel();
        } else {
            this.openSlidingPanel();
        }
    }

    private openSlidingPanel() {
        if (this.isPanelOpen) return;
        this.isPanelOpen = true;
        this.createWordsPanel();
    }

    private closeSlidingPanel() {
        if (!this.isPanelOpen) return;
        this.isPanelOpen = false;
        this.scene.tweens.add({
            targets: this.slidingPanel,
            x: this.scene.cameras.main.width,
            duration: 300,
            ease: 'Power2',
            onComplete: () => this.slidingPanel.destroy()
        });
    }

    private createWordsPanel() {
        const panelHeight = this.scene.cameras.main.height;
        const startX = this.scene.cameras.main.width;
        const endX = this.scene.cameras.main.width - this.panelWidth;

        const backgroundOverlay = this.scene.add.rectangle(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, this.scene.cameras.main.width, this.scene.cameras.main.height, 0x000000, 0.5);
        backgroundOverlay.setInteractive().on('pointerdown', () => this.closeSlidingPanel()).setDepth(450);

        const panelBg = this.scene.add.rectangle(0, 0, this.panelWidth, panelHeight, 0xffffff).setOrigin(0, 0.5).setStrokeStyle(2, 0x333333);
        const closeButton = this.scene.add.text(this.panelWidth - 30, -panelHeight / 2 + 30, '✕', { fontSize: '24px', color: '#666666', fontFamily: 'Outfit' }).setOrigin(0.5).setInteractive().on('pointerdown', () => this.closeSlidingPanel());
        const title = this.scene.add.text(20, -panelHeight / 2 + 40, 'Discovered Words', { fontSize: '24px', color: '#000000', fontFamily: 'Outfit', fontStyle: 'bold' }).setOrigin(0, 0.5);

        const wordsContainer = this.scene.add.container(20, -panelHeight / 2 + 80);
        this.gameStateManager.foundWords.forEach((word, index) => {
            wordsContainer.add(this.scene.add.text(0, index * 30, word, { fontSize: '18px', color: '#333333', fontFamily: 'Outfit' }).setOrigin(0, 0.5));
        });

        this.slidingPanel = this.scene.add.container(startX, this.scene.cameras.main.height / 2, [backgroundOverlay, panelBg, closeButton, title, wordsContainer]);
        this.slidingPanel.setDepth(500);

        this.scene.tweens.add({ targets: this.slidingPanel, x: endX, duration: 300, ease: 'Power2' });
    }

    public isUIOpen(): boolean {
        return this.isPanelOpen;
    }
}
