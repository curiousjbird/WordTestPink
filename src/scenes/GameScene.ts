import Phaser from 'phaser';
import { SettingsManager } from '../managers/SettingsManager';
import { GameStateManager } from '../managers/GameStateManager';
import { WordManager } from '../managers/WordManager';
import { GridManager } from '../managers/GridManager';
import { UIManager } from '../managers/UIManager';
import { InputManager } from '../managers/InputManager';

export class GameScene extends Phaser.Scene {
    private settingsManager!: SettingsManager;
    private gameStateManager!: GameStateManager;
    private wordManager!: WordManager;
    private gridManager!: GridManager;
    private uiManager!: UIManager;
    private inputManager!: InputManager;

    private isRotating: boolean = false;
    private levelData: { level: number, goal: number, time_limit_sec: number }[] = [];

    constructor() {
        super('GameScene');
    }

    init(data?: { startLevel?: number }) {
        const startLevel = (data && data.startLevel) ? data.startLevel : 1;
        this.gameStateManager = new GameStateManager(startLevel);
    }

    preload() {
        this.load.text('wordList', 'assets/words_english.txt');
        this.load.text('hiddenWords', 'assets/wordlists/hiddenwords.txt');
        this.load.json('debugSettings', 'assets/debug.json');
        this.load.text('levelData', 'assets/data_files/level_detail.csv');
        this.load.svg('bookmarkIcon', 'assets/icons/bookmarklet.svg', { width: 32, height: 32 });
        this.load.svg('rotateIcon', 'assets/icons/clockwise-rotation.svg', { width: 32, height: 32 });
        this.load.svg('settingsIcon', 'assets/icons/settings-knobs.svg', { width: 32, height: 32 });
    }

    create() {
        const wordList = this.cache.text.get('wordList').split('\n').map((s: string) => s.trim().toUpperCase());
        const hiddenWordsList = this.cache.text.get('hiddenWords').split('\n').map((s: string) => s.trim().toUpperCase()).filter((w: string) => w.length > 0);

        this.wordManager = new WordManager(wordList, hiddenWordsList);

        const size = Math.min(this.cameras.main.width, this.cameras.main.height);
        this.gridManager = new GridManager(this, this.wordManager, size * 0.96);

        this.uiManager = new UIManager(this, this.gameStateManager);
        this.settingsManager = new SettingsManager(this, () => {});

        this.inputManager = new InputManager(this, this.gridManager, this.settingsManager, this.uiManager, this.checkWord.bind(this));
        this.inputManager.registerInputEvents();

        this.parseLevelData();
        this.uiManager.createUI(
            this.rotateBoard.bind(this),
            () => this.uiManager.toggleWordsPanel(),
            () => this.settingsManager.openSettings()
        );

        this.setupLevel(this.gameStateManager.level);
    }

    private parseLevelData() {
        const data = this.cache.text.get('levelData').split('\n');
        data.shift();
        this.levelData = data.map((row: string) => {
            const [level, goal, time_limit_sec] = row.trim().split(',');
            return {
                level: parseInt(level, 10),
                goal: parseInt(goal, 10),
                time_limit_sec: parseInt(time_limit_sec, 10)
            };
        }).filter((row: { level: number; goal: number; time_limit_sec: number; }) => !isNaN(row.level));
    }

    private setupLevel(levelNumber: number) {
        this.gameStateManager.resetForNewLevel();
        const levelInfo = this.levelData.find(l => l.level === levelNumber);

        if (!levelInfo) {
            // Handle game completion
            return;
        }

        this.gameStateManager.setGoal(levelInfo.goal);
        this.uiManager.updateUI();

        if (this.gridManager.gridContainer) this.gridManager.gridContainer.destroy();
        this.gridManager.generateAndCreateGrid();
    }

    private rotateBoard() {
        if (this.isRotating || this.settingsManager.isModalOpen() || this.uiManager.isUIOpen()) return;
        
        this.isRotating = true;
        this.inputManager.clearSelection();
        
        this.gridManager.rotateBoard(() => {
            this.isRotating = false;
        });
    }

    private checkWord(word: string) {
        if (word.length < 3) {
            this.handleWordResult(0xff0000); // Red for too short
            return;
        }

        if (this.gameStateManager.isWordFound(word)) {
            this.handleWordResult(0xffff00); // Yellow for already found
            return;
        }

        if (this.wordManager.isValidWord(word)) {
            this.gameStateManager.addFoundWord(word);
            this.updateScore(word);

            const isHidden = this.wordManager.isHiddenWord(word);
            this.handleWordResult(isHidden ? 0x00ffff : 0x00ff00, isHidden);
        } else {
            this.handleWordResult(0xff0000); // Red for invalid
        }
    }

    private handleWordResult(color: number, stay: boolean = false) {
        const selectedTiles = this.inputManager.getSelectedLetters();
        this.uiManager.flashTiles(selectedTiles, color, () => {
            this.inputManager.clearSelection(stay);
            if (stay) {
                // Potentially refresh tile colors if needed
            }
        }, stay);
    }

    private updateScore(word: string) {
        const len = word.length;
        let points = 0;
        if (len === 3) points = 1;
        else if (len === 4) points = 3;
        else if (len === 5) points = 5;
        else if (len === 6) points = 9;
        else if (len > 6) points = 9 + (len - 6);

        if (this.wordManager.isHiddenWord(word)) {
            points *= 2;
        }

        const specialBonusMultiplier = this.calculateSpecialTileBonus();
        points *= specialBonusMultiplier;

        this.gameStateManager.addScore(points);
        this.uiManager.updateUI();

        if (this.gameStateManager.checkGoalReached()) {
            this.uiManager.showLevelCompletePopup(() => {
                this.gameStateManager.advanceLevel();
                this.scene.start('ShopScene', {
                    level: this.gameStateManager.level,
                    score: this.gameStateManager.score
                });
            });
        }
    }

    private calculateSpecialTileBonus(): number {
        let multiplier = 1;
        for (const tile of this.inputManager.getSelectedLetters()) {
            if (tile.specialType === 'gold') {
                multiplier *= 2;
            }
        }
        return multiplier;
    }
} 