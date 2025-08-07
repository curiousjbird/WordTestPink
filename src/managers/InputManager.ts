import Phaser from 'phaser';
import { GridManager, type LetterTile } from './GridManager';
import { SettingsManager } from './SettingsManager';
import { UIManager } from './UIManager';

export class InputManager {
    private scene: Phaser.Scene;
    private gridManager: GridManager;
    private settingsManager: SettingsManager;
    private uiManager: UIManager;

    private isSwiping: boolean = false;
    private selectedLetters: LetterTile[] = [];
    private currentPath: { x: number; y: number }[] = [];

    private onWordCheck: (word: string) => void;

    constructor(
        scene: Phaser.Scene,
        gridManager: GridManager,
        settingsManager: SettingsManager,
        uiManager: UIManager,
        onWordCheck: (word: string) => void
    ) {
        this.scene = scene;
        this.gridManager = gridManager;
        this.settingsManager = settingsManager;
        this.uiManager = uiManager;
        this.onWordCheck = onWordCheck;
    }

    public registerInputEvents() {
        this.scene.input.on('pointerdown', this.startSwipe, this);
        this.scene.input.on('pointermove', this.handleSwipeMove, this);
        this.scene.input.on('pointerup', this.endSwipe, this);
    }

    private startSwipe(pointer: Phaser.Input.Pointer) {
        if (this.isBlocked()) return;

        const letterTile = this.getTileAt(pointer.worldX, pointer.worldY);
        if (letterTile) {
            this.clearSelection();
            this.isSwiping = true;
            this.addLetterToSelection(letterTile);
        }
    }

    private handleSwipeMove(pointer: Phaser.Input.Pointer) {
        if (!this.isSwiping || this.isBlocked()) return;

        const letterTile = this.getTileAt(pointer.worldX, pointer.worldY);
        if (!letterTile) return;

        const isAlreadySelected = this.selectedLetters.includes(letterTile);
        if (isAlreadySelected) {
            if (this.selectedLetters.length > 1 && letterTile === this.selectedLetters[this.selectedLetters.length - 2]) {
                this.deselectLastLetter();
            }
        } else {
            this.addLetterToSelection(letterTile);
        }
    }

    private endSwipe() {
        if (!this.isSwiping || this.isBlocked()) return;
        this.isSwiping = false;

        if (this.getCurrentWord().length > 0) {
            this.onWordCheck(this.getCurrentWord());
        }
    }

    private getTileAt(worldX: number, worldY: number): LetterTile | null {
        for (let y = 0; y < this.gridManager.grid.length; y++) {
            for (let x = 0; x < this.gridManager.grid[y].length; x++) {
                const tile = this.gridManager.grid[y][x];
                const tileWorldPos = this.gridManager.gridContainer.getWorldTransformMatrix().transformPoint(tile.container.x, tile.container.y);

                const distance = Phaser.Math.Distance.Between(worldX, worldY, tileWorldPos.x, tileWorldPos.y);
                const sensitivity = this.selectedLetters.length === 0 ? 0.9 : this.settingsManager.getSettings().swipeSensitivity;
                const hitRadius = this.gridManager.tileSize * sensitivity;

                if (distance <= hitRadius) {
                    return tile;
                }
            }
        }
        return null;
    }

    private addLetterToSelection(letterTile: LetterTile) {
        const pos = this.getTilePosition(letterTile);
        if (!pos || this.selectedLetters.includes(letterTile) || !this.isValidSelection(pos.x, pos.y)) return;

        this.currentPath.push(pos);
        this.selectedLetters.push(letterTile);
        letterTile.background.setFillStyle(0x0000ff); // Blue
    }

    private deselectLastLetter() {
        const lastTile = this.selectedLetters.pop();
        if (lastTile) {
            this.currentPath.pop();
            this.resetTileColor(lastTile);
        }
    }

    private isValidSelection(x: number, y: number): boolean {
        if (this.currentPath.length === 0) return true;
        const lastPos = this.currentPath[this.currentPath.length - 1];
        return Math.abs(x - lastPos.x) <= 1 && Math.abs(y - lastPos.y) <= 1;
    }

    private getTilePosition(letterTile: LetterTile): { x: number; y: number } | null {
        for (let y = 0; y < this.gridManager.grid.length; y++) {
            for (let x = 0; x < this.gridManager.grid[y].length; x++) {
                if (this.gridManager.grid[y][x] === letterTile) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    public clearSelection(keepColor: boolean = false) {
        if (!keepColor) {
            this.selectedLetters.forEach(tile => this.resetTileColor(tile));
        }
        this.currentPath = [];
        this.selectedLetters = [];
    }

    public resetTileColor(tile: LetterTile) {
        // This logic is complex and depends on game state, so we'll simplify it for now
        // A more robust solution might involve events or a dedicated visual manager
        tile.background.setFillStyle(0xffffff); // White
        if (tile.specialType === 'gold') {
            tile.background.setStrokeStyle(4, 0xffd700);
        }
    }

    public getSelectedLetters(): LetterTile[] {
        return this.selectedLetters;
    }

    public getCurrentWord(): string {
        return this.selectedLetters.map(t => t.letter).join('');
    }

    private isBlocked(): boolean {
        // Will need to add isRotating from GameScene
        return this.settingsManager.isModalOpen() || this.uiManager.isUIOpen();
    }
}
