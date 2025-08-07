import Phaser from 'phaser';
import { WordManager } from './WordManager';

export type LetterTile = {
    container: Phaser.GameObjects.Container;
    text: Phaser.GameObjects.Text;
    background: Phaser.GameObjects.Rectangle;
    letter: string;
    specialType: string; // SpecialTileType
};

export class GridManager {
    private scene: Phaser.Scene;
    private wordManager: WordManager;
    private letterFrequencies = {
        E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1, R: 6.0,
        D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0,
        P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.2, X: 0.2, Q: 0.1, Z: 0.1,
    };
    private weightedLetters: string[] = [];
    private gridSize: number = 5;

    public grid: LetterTile[][] = [];
    public gridContainer!: Phaser.GameObjects.Container;
    public tileSize: number;
    public cellSpacing: number;

    constructor(scene: Phaser.Scene, wordManager: WordManager, gridPixelWidth: number) {
        this.scene = scene;
        this.wordManager = wordManager;
        this.cellSpacing = gridPixelWidth / this.gridSize;
        this.tileSize = this.cellSpacing * 0.9;
        this.createWeightedLetters();
    }

    public generateAndCreateGrid(): void {
        const letterLayout = this.generatePuzzleGrid();
        this.createGrid(letterLayout);
    }

    private createWeightedLetters() {
        this.weightedLetters = [];
        for (const letter in this.letterFrequencies) {
            const weight = this.letterFrequencies[letter as keyof typeof this.letterFrequencies] * 10;
            for (let i = 0; i < weight; i++) {
                this.weightedLetters.push(letter);
            }
        }
    }

    private getRandomLetter(): string {
        const randomIndex = Math.floor(Math.random() * this.weightedLetters.length);
        return this.weightedLetters[randomIndex];
    }

    private generatePuzzleGrid(): string[][] {
        const grid: (string | null)[][] = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));
        const hiddenWords = this.wordManager.getHiddenWords();
        const numWordsToPlace = Phaser.Math.Between(2, Math.min(5, hiddenWords.length));
        const wordsToPlace = Phaser.Utils.Array.Shuffle([...hiddenWords]).slice(0, numWordsToPlace);

        this.wordManager.clearPlacedWords();

        for (const word of wordsToPlace) {
            this.tryPlaceWord(word.toUpperCase(), grid);
        }

        const finalGrid: string[][] = [];
        for (let y = 0; y < this.gridSize; y++) {
            finalGrid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                finalGrid[y][x] = grid[y][x] || this.getRandomLetter();
            }
        }
        return finalGrid;
    }

    private tryPlaceWord(word: string, grid: (string | null)[][]): boolean {
        const startPositions = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                startPositions.push({ x, y });
            }
        }
        Phaser.Utils.Array.Shuffle(startPositions);

        for (const pos of startPositions) {
            const path = this.findPathForWord(word, grid, pos.x, pos.y);
            if (path) {
                for (let i = 0; i < word.length; i++) {
                    const { x, y } = path[i];
                    grid[y][x] = word[i];
                }
                this.wordManager.addPlacedWord(word, path);
                return true;
            }
        }
        return false;
    }

    private findPathForWord(word: string, grid: (string | null)[][], startX: number, startY: number): {x: number, y: number}[] | null {
        const path: {x: number, y: number}[] = [];
        const visited: boolean[][] = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(false));

        const search = (x: number, y: number, index: number): boolean => {
            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize || visited[y][x]) return false;

            const cellLetter = grid[y][x];
            if (cellLetter !== null && cellLetter !== word[index]) return false;

            visited[y][x] = true;
            path.push({ x, y });

            if (index === word.length - 1) return true;

            const neighbors = Phaser.Utils.Array.Shuffle(this.getNeighbors(x, y));
            for (const neighbor of neighbors) {
                if (search(neighbor.x, neighbor.y, index + 1)) return true;
            }

            visited[y][x] = false;
            path.pop();
            return false;
        };

        return search(startX, startY, 0) ? path : null;
    }

    private getNeighbors(x: number, y: number): {x: number, y: number}[] {
        const neighbors = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                neighbors.push({ x: x + dx, y: y + dy });
            }
        }
        return neighbors;
    }

    private createGrid(letterLayout: string[][]) {
        const gridWidth = (this.gridSize - 1) * this.cellSpacing;
        const gridX = this.scene.cameras.main.width / 2;
        const gridY = this.scene.cameras.main.height / 2 - (this.scene.cameras.main.height * 0.1);
        this.gridContainer = this.scene.add.container(gridX, gridY);

        const startX = -gridWidth / 2;
        const startY = -gridWidth / 2;

        this.grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                const letter = letterLayout[y][x];
                const xPos = startX + x * this.cellSpacing;
                const yPos = startY + y * this.cellSpacing;

                const background = this.scene.add.rectangle(0, 0, this.tileSize, this.tileSize, 0xffffff);
                const text = this.scene.add.text(0, 0, letter, {
                    fontSize: `${this.tileSize * 0.8}px`,
                    color: '#000000',
                    fontFamily: 'Outfit',
                    fontStyle: 'bold'
                }).setOrigin(0.5);

                const container = this.scene.add.container(xPos, yPos, [background, text]);
                container.setInteractive(new Phaser.Geom.Rectangle(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize), Phaser.Geom.Rectangle.Contains);

                this.grid[y][x] = { container, text, background, letter, specialType: 'none' };
                this.gridContainer.add(container);
            }
        }
        this.assignSpecialTiles();
    }

    private assignSpecialTiles() {
        const allTiles = this.grid.flat();
        const goldTile = Phaser.Utils.Array.GetRandom(allTiles);
        if (goldTile) {
            goldTile.specialType = 'gold';
            goldTile.background.setStrokeStyle(4, 0xffd700);
        }
    }

    public rotateBoard(onComplete: () => void) {
        const newGrid: LetterTile[][] = Array.from({ length: this.gridSize }, () => []);
        this.grid.flat().forEach((tile, index) => {
            const oldRow = Math.floor(index / this.gridSize);
            const oldCol = index % this.gridSize;
            const newRow = oldCol;
            const newCol = this.gridSize - 1 - oldRow;
            newGrid[newRow][newCol] = tile;

            const newX = (newCol - (this.gridSize - 1) / 2) * this.cellSpacing;
            const newY = (newRow - (this.gridSize - 1) / 2) * this.cellSpacing;

            this.scene.tweens.add({ targets: tile.container, x: newX, y: newY, duration: 500, ease: 'Power2' });
        });

        this.scene.tweens.add({
            targets: this.gridContainer,
            angle: '+=90',
            duration: 500,
            ease: 'Power2',
            onUpdate: () => {
                this.gridContainer.each((child: Phaser.GameObjects.GameObject) => {
                    if (child instanceof Phaser.GameObjects.Container) {
                        child.angle = -this.gridContainer.angle;
                    }
                });
            },
            onComplete: () => {
                this.gridContainer.each((child: Phaser.GameObjects.GameObject) => {
                    if (child instanceof Phaser.GameObjects.Container) child.angle = 0;
                });
                this.gridContainer.angle = 0;
                this.grid = newGrid;
                onComplete();
            }
        });
    }
}
