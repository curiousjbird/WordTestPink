import Phaser from 'phaser';

const SpecialTileType = {
  NONE: 'none',
  GOLD: 'gold'
} as const;

type SpecialTileType = typeof SpecialTileType[keyof typeof SpecialTileType];

type LetterTile = {
    container: Phaser.GameObjects.Container;
    text: Phaser.GameObjects.Text;
    background: Phaser.GameObjects.Rectangle;
    letter: string;
    specialType: SpecialTileType;
};

export class GameScene extends Phaser.Scene {
  private grid: LetterTile[][] = [];
  private letterFrequencies = {
    E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1, R: 6.0,
    D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0,
    P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.2, X: 0.2, Q: 0.1, Z: 0.1,
  };
  private tileSize: number = 0;
  private cellSpacing: number = 0;
  // Swipe sensitivity setting - percentage of tile size to use as hit radius
  private swipeHitRadiusPercent: number = 0.25; // 25% of tile size (default)
  private weightedLetters: string[] = [];
  // Settings
  private settings = {
    swipeSensitivity: 0.25
  };
  private settingsModal!: Phaser.GameObjects.Container;
  private isSettingsOpen: boolean = false;
  // Sliding panel system
  private slidingPanel!: Phaser.GameObjects.Container;
  private isPanelOpen: boolean = false;
  private panelWidth: number = 0;
  private currentWord: string = '';
  private currentPath: { x: number; y: number }[] = [];
  private selectedLetters: LetterTile[] = [];
  private wordList: string[] = [];
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private foundWords: string[] = [];
  // Timer removed - now goal-based gameplay
  private gridContainer!: Phaser.GameObjects.Container;
  private isRotating: boolean = false;
  private isSwiping: boolean = false;
  private hiddenWordsList: string[] = [];
  private placedWords: { word: string, path: {x: number, y: number}[] }[] = [];
  private debugSettings: any;
  private levelData: { level: number, goal: number, time_limit_sec: number }[] = [];
  private currentLevel: number = 1;
  private currentGoal: number = 0;
  private levelText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  init(data?: { startLevel?: number }) {
    // Handle initialization data from shop scene or direct start
    if (data && data.startLevel) {
      this.currentLevel = data.startLevel;
    } else {
      this.currentLevel = 1;
    }
  }

  preload() {
    this.load.text('wordList', 'assets/words_english.txt');
    this.load.text('hiddenWords', 'assets/wordlists/hiddenwords.txt');
    this.load.json('debugSettings', 'assets/debug.json');
    this.load.text('levelData', 'assets/data_files/level_detail.csv');
    this.load.svg('bookmarkIcon', 'assets/icons/bookmark.svg', { width: 32, height: 32 });
  }

  create() {
    this.wordList = this.cache.text.get('wordList').split('\n').map((s: string) => s.trim().toUpperCase());
    this.hiddenWordsList = this.cache.text.get('hiddenWords').split('\n').map((s: string) => s.trim().toUpperCase()).filter((w: string) => w.length > 0);
    this.debugSettings = this.cache.json.get('debugSettings');

    const size = Math.min(this.cameras.main.width, this.cameras.main.height);
    const gridContainerWidth = size * 0.96;
    this.cellSpacing = gridContainerWidth / 5;
    this.tileSize = this.cellSpacing * 0.9;

    // Load settings from localStorage
    this.loadSettings();

    this.parseLevelData();
    this.setupUI();
    this.setupLevel(this.currentLevel);
    
    this.input.on('pointerdown', this.startSwipe, this);
    this.input.on('pointermove', this.handleSwipeMove, this);
    this.input.on('pointerup', this.endSwipe, this);
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
    this.currentLevel = levelNumber;
    const levelInfo = this.levelData.find(l => l.level === this.currentLevel);

    if (!levelInfo) {
        this.feedbackText.setText('You Win!').setColor('#00ff00').setDepth(1);
        this.gridContainer.destroy();
        return;
    }

    this.currentGoal = levelInfo.goal;
    this.score = 0;
    
    this.foundWords = [];
    if(this.feedbackText) this.feedbackText.setText('');
    
    this.levelText.setText(`Level: ${this.currentLevel}`);
    this.goalText.setText(`Goal: ${this.currentGoal}`);
    this.scoreText.setText(`Score: ${this.score}`);

    if (this.gridContainer) this.gridContainer.destroy();
    this.createWeightedLetters();
    const letterLayout = this.generatePuzzleGrid();
    this.createGrid(letterLayout);
    this.displayGrid();
    
    // Re-enable interactions for new level
    this.grid.flat().forEach(tile => tile.container.setInteractive());
  }

  private setupUI() {

    this.levelText = this.add.text(10, 10, '', { fontSize: '24px', color: '#ffffff', fontFamily: 'Outfit' });
    this.goalText = this.add.text(10, 40, '', { fontSize: '24px', color: '#ffffff', fontFamily: 'Outfit' });
    this.scoreText = this.add.text(10, 70, '', { fontSize: '24px', color: '#ffffff', fontFamily: 'Outfit' });

    this.feedbackText = this.add.text(this.cameras.main.width / 2, 120, '', {
      fontSize: '24px',
      color: '#ff0000',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    const clearButton = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 50, 'Clear', {
        fontSize: '32px',
        color: '#ffff00',
        fontFamily: 'Outfit'
    }).setOrigin(0.5).setInteractive();
    
    const clearHitArea = new Phaser.Geom.Rectangle(0, 0, 100, 50);
    clearButton.setInteractive(clearHitArea, Phaser.Geom.Rectangle.Contains);
    clearButton.on('pointerdown', () => this.clearSelection());

    const rotateButton = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 120, 'Rotate', {
      fontSize: '32px',
      fontFamily: 'Outfit',
      color: '#ffffff'
    }).setOrigin(0.5);

    const rotateHitArea = new Phaser.Geom.Rectangle(0, 0, 120, 50);
    rotateButton.setInteractive(rotateHitArea, Phaser.Geom.Rectangle.Contains);
    rotateButton.on('pointerdown', () => this.rotateBoard());

    // Bookmark icon for discovered words (above rotate button)
    const bookmarkIcon = this.add.image(this.cameras.main.width / 2, this.cameras.main.height - 180, 'bookmarkIcon');
    bookmarkIcon.setScale(0.8);
    bookmarkIcon.setTint(0xffffff); // Make it white
    bookmarkIcon.setInteractive();
    bookmarkIcon.on('pointerdown', () => this.toggleWordsPanel());

    // Settings gear icon
    const settingsButton = this.add.text(60, this.cameras.main.height - 60, '⚙️', {
      fontSize: '32px',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    const settingsHitArea = new Phaser.Geom.Rectangle(0, 0, 60, 60);
    settingsButton.setInteractive(settingsHitArea, Phaser.Geom.Rectangle.Contains);
    settingsButton.on('pointerdown', () => this.openSettings());

    // Initialize panel width (3/4 of screen width)
    this.panelWidth = this.cameras.main.width * 0.75;
  }
  
  // Timer methods removed - now using goal-based progression

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
    const gridSize = 5;
    const grid: (string | null)[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

    const numWordsToPlace = Phaser.Math.Between(2, 5);
    const wordsToPlace = Phaser.Utils.Array.Shuffle([...this.hiddenWordsList]).slice(0, numWordsToPlace);

    this.placedWords = [];

    for (const word of wordsToPlace) {
        const placed = this.tryPlaceWord(word.toUpperCase(), grid);
        if (!placed) {
            console.warn(`Failed to place word: ${word}`);
        }
    }

    const finalGrid: string[][] = [];
    for (let y = 0; y < gridSize; y++) {
        finalGrid[y] = [];
        for (let x = 0; x < gridSize; x++) {
            if (grid[y][x] === null) {
                finalGrid[y][x] = this.getRandomLetter();
            } else {
                finalGrid[y][x] = grid[y][x]!;
            }
        }
    }
    return finalGrid;
  }

  private tryPlaceWord(word: string, grid: (string | null)[][]): boolean {
    const gridSize = 5;
    const startPositions = [];
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
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
            this.placedWords.push({ word, path });
            return true;
        }
    }

    return false;
  }

    private findPathForWord(word: string, grid: (string | null)[][], startX: number, startY: number): {x: number, y: number}[] | null {
      const path: {x: number, y: number}[] = [];
      const visited: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));

      const search = (x: number, y: number, index: number): boolean => {
          // Check boundaries
          if (x < 0 || x >= 5 || y < 0 || y >= 5) return false;

          // Check if already visited in current path
          if (visited[y][x]) return false;

          // Check if cell is available or matches the required letter
          const cellLetter = grid[y][x];
          const wordLetter = word[index];
          if (cellLetter !== null && cellLetter !== wordLetter) {
              return false;
          }

          // Mark as visited and add to path
          visited[y][x] = true;
          path.push({ x, y });

          // Base case: word is fully placed
          if (index === word.length - 1) {
              return true;
          }

          // Get neighbors and shuffle them
          const neighbors = this.getNeighbors(x, y);
          Phaser.Utils.Array.Shuffle(neighbors);

          // Recursive search
          for (const neighbor of neighbors) {
              if (search(neighbor.x, neighbor.y, index + 1)) {
                  return true;
              }
          }

          // Backtrack
          visited[y][x] = false;
          path.pop();
          return false;
      };

      if (search(startX, startY, 0)) {
          return path;
      }

      return null;
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
    const rows = letterLayout.length;
    const columns = letterLayout[0].length;
    const cellWidth = this.cellSpacing;
    const cellHeight = this.cellSpacing;
    const gridWidth = (columns - 1) * cellWidth;
    
    const gridX = this.cameras.main.width / 2;
    const gridY = this.cameras.main.height / 2 - (this.cameras.main.height * 0.1);
    this.gridContainer = this.add.container(gridX, gridY);

    const startX = -gridWidth / 2;
    const startY = -gridWidth / 2;

    for (let y = 0; y < rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < columns; x++) {
        const letter = letterLayout[y][x];
        const xPos = startX + x * cellWidth;
        const yPos = startY + y * cellHeight;

        const background = this.add.rectangle(0, 0, this.tileSize, this.tileSize, 0xffffff);
        const text = this.add.text(0, 0, letter, {
          fontSize: `${this.tileSize * 0.8}px`,
          color: '#000000',
          fontFamily: 'VT323'
        }).setOrigin(0.5);
        
        const container = this.add.container(xPos, yPos, [ background, text ]);
        const hitArea = new Phaser.Geom.Rectangle(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        const letterTile: LetterTile = { container, text, background, letter, specialType: SpecialTileType.NONE };
        
        this.grid[y][x] = letterTile;
        this.gridContainer.add(container);
      }
    }
    
    if (this.debugSettings.show_hidden_words) {
        this.placedWords.forEach(pWord => {
            pWord.path.forEach(pos => {
                this.grid[pos.y][pos.x].background.setFillStyle(0xffff00); // Yellow
            });
        });
    }

    // Assign one random tile as GOLD
    this.assignSpecialTiles();
  }

  private assignSpecialTiles() {
    // Get all tiles
    const allTiles = this.grid.flat();
    
    // Randomly select one tile to be GOLD
    const randomIndex = Phaser.Math.Between(0, allTiles.length - 1);
    const goldTile = allTiles[randomIndex];
    
    goldTile.specialType = SpecialTileType.GOLD;
    this.applySpecialTileVisuals(goldTile);
  }

  private applySpecialTileVisuals(tile: LetterTile) {
    switch (tile.specialType) {
      case SpecialTileType.GOLD:
        // Add gold border
        tile.background.setStrokeStyle(4, 0xffd700); // Gold color
        break;
      case SpecialTileType.NONE:
      default:
        // No special styling
        break;
    }
  }

  private rotateBoard() {
    if (this.isRotating) return;
    this.isRotating = true;
    this.clearSelection();

    const newGrid: LetterTile[][] = Array.from({ length: 5 }, () => []);

    // Animate each tile to its new position.
    this.grid.flat().forEach((tile, index) => {
        const oldRow = Math.floor(index / 5);
        const oldCol = index % 5;
        const newRow = oldCol;
        const newCol = 4 - oldRow;
        
        newGrid[newRow][newCol] = tile;
        
        const newX = (newCol - 2) * this.cellSpacing;
        const newY = (newRow - 2) * this.cellSpacing;
        
        this.tweens.add({
            targets: tile.container,
            x: newX,
            y: newY,
            duration: 500,
            ease: 'Power2'
        });
    });

    // Animate the main container and counter-rotate the children on each frame.
    this.tweens.add({
        targets: this.gridContainer,
        angle: '+=90',
        duration: 500,
        ease: 'Power2',
        onUpdate: () => {
            // Counter-rotate each tile so it appears upright
            this.gridContainer.each((child: Phaser.GameObjects.GameObject) => {
                if (child instanceof Phaser.GameObjects.Container) {
                    child.angle = -this.gridContainer.angle;
                }
            });
        },
        onComplete: () => {
            // Animation is done, "bake" the final state.
            this.gridContainer.each((child: Phaser.GameObjects.GameObject) => {
                if (child instanceof Phaser.GameObjects.Container) {
                    child.angle = 0;
                }
            });
            // Reset the main container's angle as well.
            this.gridContainer.angle = 0;
            
            // Update the logical grid.
            this.grid = newGrid;
            this.isRotating = false;
        }
    });
  }

  private startSwipe(pointer: Phaser.Input.Pointer) {
    if (this.isRotating || this.isSettingsOpen || this.isPanelOpen) return;

    const letterTile = this.getTileAt(pointer.worldX, pointer.worldY);
    if (letterTile) {
      this.clearSelection();
      this.isSwiping = true;
      this.addLetterToSelection(letterTile);
    }
  }

  private handleSwipeMove(pointer: Phaser.Input.Pointer) {
    if (!this.isSwiping || this.isSettingsOpen || this.isPanelOpen) return;

    const letterTile = this.getTileAt(pointer.worldX, pointer.worldY);
    if (!letterTile) {
        return;
    }

    const isAlreadySelected = this.selectedLetters.includes(letterTile);

    if (isAlreadySelected && this.selectedLetters.length > 1) {
        const secondLastTile = this.selectedLetters[this.selectedLetters.length - 2];
        if (letterTile === secondLastTile) {
            this.deselectLastLetter();
        }
    } else {
        this.addLetterToSelection(letterTile);
    }
  }

  private endSwipe() {
    if (!this.isSwiping || this.isSettingsOpen || this.isPanelOpen) return;
    this.isSwiping = false;
    
    if (this.currentWord.length > 0) {
        this.checkWord();
    }
  }

  private getTileAt(worldX: number, worldY: number): LetterTile | null {
    for (let y = 0; y < this.grid.length; y++) {
        for (let x = 0; x < this.grid[y].length; x++) {
            const tile = this.grid[y][x];
            
            // Get the world position of the tile center
            const tileWorldPos = this.gridContainer.getWorldTransformMatrix().transformPoint(
                tile.container.x, 
                tile.container.y
            );
            
            // Calculate distance from pointer to tile center
            const dx = worldX - tileWorldPos.x;
            const dy = worldY - tileWorldPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Use higher sensitivity (90%) for first letter, user setting for subsequent letters
            const sensitivity = this.selectedLetters.length === 0 ? 0.9 : this.swipeHitRadiusPercent;
            const hitRadius = this.tileSize * sensitivity;
            
            if (distance <= hitRadius) {
                return tile;
            }
        }
    }
    return null;
  }

  private addLetterToSelection(letterTile: LetterTile) {
    const pos = this.getTilePosition(letterTile);
    if (!pos) return;
    
    const isAlreadySelected = this.selectedLetters.includes(letterTile);
    if (isAlreadySelected) return;

    if (this.isValidSelection(pos.x, pos.y)) {
      this.currentWord += letterTile.letter;
      this.currentPath.push({ x: pos.x, y: pos.y });
      this.selectedLetters.push(letterTile);
      letterTile.background.setFillStyle(0x0000ff); // Blue
    }
  }
  
  private deselectLastLetter() {
    const lastTile = this.selectedLetters.pop();
    if (lastTile) {
        this.currentWord = this.currentWord.slice(0, -1);
        this.currentPath.pop();
        this.resetTileColor(lastTile);
    }
  }

  private checkWord() {
    const word = this.currentWord;

    if (word.length < 3) {
        this.flashTiles(this.selectedLetters, 0xff0000); // Red for too short
        this.time.delayedCall(500, () => this.clearSelection());
        return;
    }

    if (this.foundWords.includes(word)) {
        this.flashTiles(this.selectedLetters, 0xffff00); // Yellow for already found
        this.time.delayedCall(500, () => this.clearSelection());
        return;
    }

    if (this.wordList.includes(word)) {
        this.foundWords.push(word);
        this.updateScore(word);

        const hiddenWord = this.placedWords.find(p => p.word === word);
        if (hiddenWord) {
             this.flashTiles(this.selectedLetters, 0x00ffff, true); // Cyan for hidden word
        } else {
            this.flashTiles(this.selectedLetters, 0x00ff00); // Green for valid
        }
    } else {
      this.flashTiles(this.selectedLetters, 0xff0000); // Red for invalid
    }
  }

  private flashTiles(tiles: LetterTile[], color: number, stay = false) {
    tiles.forEach(tile => {
        this.tweens.add({
            targets: tile.background,
            scaleX: 1.2,
            scaleY: 1.2,
            yoyo: true,
            duration: 200,
            ease: 'Power2',
            onStart: () => {
                tile.background.setFillStyle(color);
            },
            onComplete: () => {
                tile.background.scale = 1;
                if (!stay) {
                     this.time.delayedCall(300, () => this.clearSelection());
                } else {
                    this.clearSelection(true); // Clear selection but keep color for found hidden words
                }
            }
        });
    });
  }

  private resetTileColor(tile: LetterTile) {
    const tilePos = this.getTilePosition(tile);

    if (tilePos) {
        const isPartOfFoundHiddenWord = this.placedWords.some(pWord => 
            this.foundWords.includes(pWord.word) && pWord.path.some(pathPos => 
                pathPos.x === tilePos.x && pathPos.y === tilePos.y
            )
        );

        if (isPartOfFoundHiddenWord) {
            return; 
        }

        if (this.debugSettings.show_hidden_words) {
            const isHiddenForDebug = this.placedWords.some(pWord => 
                pWord.path.some(pathPos => pathPos.x === tilePos.x && pathPos.y === tilePos.y)
            );
            if (isHiddenForDebug) {
                tile.background.setFillStyle(0xffff00);
                // Still apply special tile visuals even for debug mode
                this.applySpecialTileVisuals(tile);
                return;
            }
        }
    }
    
    tile.background.setFillStyle(0xffffff);
    // Reapply special tile visuals after resetting color
    this.applySpecialTileVisuals(tile);
  }

  private isValidSelection(x: number, y: number): boolean {
    if (this.currentPath.length === 0) {
      return true; // First letter can be any letter
    }

    const lastPos = this.currentPath[this.currentPath.length - 1];
    const isAdjacent = Math.abs(x - lastPos.x) <= 1 && Math.abs(y - lastPos.y) <= 1;
    const isNotSelected = !this.currentPath.some(pos => pos.x === x && pos.y === y);

    return isAdjacent && isNotSelected;
  }

  private getTilePosition(letterTile: LetterTile): { x: number; y: number } | null {
    for (let y = 0; y < this.grid.length; y++) {
        for (let x = 0; x < this.grid[y].length; x++) {
            if (this.grid[y][x] === letterTile) {
                return { x, y };
            }
        }
    }
    return null;
  }

  private clearSelection(keepColor = false) {
    this.currentWord = '';
    this.currentPath = [];
    this.selectedLetters.forEach(tile => {
        if (keepColor) return;
        
        const tilePos = this.getTilePosition(tile);
        if (tilePos) {
            const isPartOfFoundHiddenWord = this.placedWords.some(pWord => 
                this.foundWords.includes(pWord.word) && pWord.path.some(pathPos => 
                    pathPos.x === tilePos.x && pathPos.y === tilePos.y
                )
            );

            if (!isPartOfFoundHiddenWord) {
                tile.background.setFillStyle(0xffffff); // White
                // Reapply special tile visuals
                this.applySpecialTileVisuals(tile);
            }
        } else {
            tile.background.setFillStyle(0xffffff); // Fallback for safety
            // Reapply special tile visuals
            this.applySpecialTileVisuals(tile);
        }
    });
    this.selectedLetters = [];
  }

  private updateScore(word: string) {
    const len = word.length;
    let points = 0;
    if (len === 3) points = 1;
    else if (len === 4) points = 3;
    else if (len === 5) points = 5;
    else if (len === 6) points = 9;
    else if (len > 6) points = 9 + (len - 6);

    if (this.placedWords.some(p => p.word === word)) {
        points *= 2; // Double points for hidden words
    }

    // Check for special tile bonuses
    const specialBonusMultiplier = this.calculateSpecialTileBonus();
    points *= specialBonusMultiplier;

    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);
    
    // Check if goal is reached
    if (this.score >= this.currentGoal) {
      this.showLevelCompletePopup();
    }
  }

  private showLevelCompletePopup() {
    // Disable further interactions
    this.isSwiping = false;
    this.grid.flat().forEach(tile => tile.container.disableInteractive());

    const modalWidth = 400;
    const modalHeight = 250;
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Background overlay
    const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);
    overlay.setOrigin(0);

    // Modal background
    const modalBg = this.add.rectangle(0, 0, modalWidth, modalHeight, 0xffffff);
    modalBg.setStrokeStyle(2, 0x00ff00);

    // Title
    const title = this.add.text(0, -modalHeight/2 + 40, `You beat level ${this.currentLevel}!`, {
      fontSize: '24px',
      color: '#000000',
      fontFamily: 'Outfit',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Score text
    const scoreText = this.add.text(0, -20, `with a score of ${this.score}`, {
      fontSize: '20px',
      color: '#333333',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    // Question text
    const questionText = this.add.text(0, 20, 'Visit the shop before next level?', {
      fontSize: '18px',
      color: '#333333',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    // Shop button
    const shopButton = this.add.rectangle(0, modalHeight/2 - 40, 120, 40, 0x28a745);
    const shopText = this.add.text(0, modalHeight/2 - 40, 'SHOP', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);
    
    shopButton.setInteractive();
    shopButton.on('pointerdown', () => {
      // Destroy popup and go to shop
      popup.destroy();
      this.scene.start('ShopScene', { level: this.currentLevel, score: this.score });
    });

    // Create container
    const popup = this.add.container(centerX, centerY, [
      overlay, modalBg, title, scoreText, questionText, shopButton, shopText
    ]);
    popup.setDepth(1000);
  }

  private calculateSpecialTileBonus(): number {
    let multiplier = 1;
    
    // Check if any selected tiles are special
    for (const tile of this.selectedLetters) {
      switch (tile.specialType) {
        case SpecialTileType.GOLD:
          multiplier *= 2; // GOLD tile doubles the score
          break;
        // Future special tiles can be added here
        case SpecialTileType.NONE:
        default:
          // No bonus
          break;
      }
    }
    
    return multiplier;
  }

  // Word display now handled by sliding panel instead of on-screen display

  private toggleWordsPanel() {
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
    
    // Animate panel sliding out to the right
    this.tweens.add({
      targets: this.slidingPanel,
      x: this.cameras.main.width,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.slidingPanel.destroy();
      }
    });
  }

  private createWordsPanel() {
    const panelHeight = this.cameras.main.height;
    const startX = this.cameras.main.width;
    const endX = this.cameras.main.width - this.panelWidth;

    // Panel background
    const panelBg = this.add.rectangle(0, 0, this.panelWidth, panelHeight, 0xffffff);
    panelBg.setOrigin(0, 0.5);
    panelBg.setStrokeStyle(2, 0x333333);

    // Close button (X)
    const closeButton = this.add.text(this.panelWidth - 30, -panelHeight/2 + 30, '✕', {
      fontSize: '24px',
      color: '#666666',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);
    closeButton.setInteractive();
    closeButton.on('pointerdown', () => this.closeSlidingPanel());

    // Title
    const title = this.add.text(20, -panelHeight/2 + 40, 'Discovered Words', {
      fontSize: '24px',
      color: '#000000',
      fontFamily: 'Outfit',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Words list
    const wordsContainer = this.add.container(20, -panelHeight/2 + 80);
    
    this.foundWords.forEach((word, index) => {
      const yPos = index * 30;
      const wordText = this.add.text(0, yPos, word, {
        fontSize: '18px',
        color: '#333333',
        fontFamily: 'Outfit'
      }).setOrigin(0, 0.5);
      wordsContainer.add(wordText);
    });

    // Create panel container
    this.slidingPanel = this.add.container(startX, this.cameras.main.height / 2, [
      panelBg, closeButton, title, wordsContainer
    ]);
    this.slidingPanel.setDepth(500);

    // Animate panel sliding in from the right
    this.tweens.add({
      targets: this.slidingPanel,
      x: endX,
      duration: 300,
      ease: 'Power2'
    });
  }

  private displayGrid() {
    // The grid is already displayed in createGrid, this is just for clarity
  }

  update() {
    // Game loop
  }

  // Settings methods
  private loadSettings() {
    const savedSettings = localStorage.getItem('wordgame-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        this.settings = { ...this.settings, ...parsed };
        this.swipeHitRadiusPercent = this.settings.swipeSensitivity;
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
    this.swipeHitRadiusPercent = this.settings.swipeSensitivity;
    this.saveSettings();
    this.closeSettings();
  }

  private cancelSettings() {
    // Reload settings to discard changes
    this.loadSettings();
    this.closeSettings();
  }
} 