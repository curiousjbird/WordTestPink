import Phaser from 'phaser';

type LetterTile = {
    container: Phaser.GameObjects.Container;
    text: Phaser.GameObjects.Text;
    background: Phaser.GameObjects.Rectangle;
    letter: string;
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
  private weightedLetters: string[] = [];
  private currentWord: string = '';
  private currentPath: { x: number; y: number }[] = [];
  private selectedLetters: LetterTile[] = [];
  private currentWordText!: Phaser.GameObjects.Text;
  private wordList: string[] = [];
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private foundWords: string[] = [];
  private foundWordsTextGroup!: Phaser.GameObjects.Group;
  private gameTimer!: Phaser.Time.TimerEvent;
  private timerText!: Phaser.GameObjects.Text;
  private remainingTime: number = 180; // 3 minutes in seconds
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

  preload() {
    this.load.text('wordList', 'assets/words_english.txt');
    this.load.text('hiddenWords', 'assets/wordlists/hiddenwords.txt');
    this.load.json('debugSettings', 'assets/debug.json');
    this.load.text('levelData', 'assets/data_files/level_detail.csv');
  }

  create() {
    this.wordList = this.cache.text.get('wordList').split('\n').map((s: string) => s.trim().toUpperCase());
    this.hiddenWordsList = this.cache.text.get('hiddenWords').split('\n').map((s: string) => s.trim().toUpperCase()).filter((w: string) => w.length > 0);
    this.debugSettings = this.cache.json.get('debugSettings');

    const size = Math.min(this.cameras.main.width, this.cameras.main.height);
    const gridContainerWidth = size * 0.96;
    this.cellSpacing = gridContainerWidth / 5;
    this.tileSize = this.cellSpacing * 0.9;

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
    this.remainingTime = levelInfo.time_limit_sec;
    this.score = 0;
    
    this.foundWords = [];
    if (this.foundWordsTextGroup) this.foundWordsTextGroup.clear(true, true);
    if(this.feedbackText) this.feedbackText.setText('');
    
    this.levelText.setText(`Level: ${this.currentLevel}`);
    this.goalText.setText(`Goal: ${this.currentGoal}`);
    this.scoreText.setText(`Score: ${this.score}`);

    if (this.gridContainer) this.gridContainer.destroy();
    this.createWeightedLetters();
    const letterLayout = this.generatePuzzleGrid();
    this.createGrid(letterLayout);
    this.displayGrid();

    if (this.gameTimer) this.gameTimer.destroy();
    if(this.timerText) this.timerText.destroy();
    this.setupTimer();
  }

  private setupUI() {
    this.foundWordsTextGroup = this.add.group();

    this.levelText = this.add.text(10, 10, '', { fontSize: '24px', color: '#ffffff', fontFamily: 'Outfit' });
    this.goalText = this.add.text(10, 40, '', { fontSize: '24px', color: '#ffffff', fontFamily: 'Outfit' });
    this.scoreText = this.add.text(10, 70, '', { fontSize: '24px', color: '#ffffff', fontFamily: 'Outfit' });

    this.currentWordText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 200, '', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Outfit'
    }).setOrigin(0.5);

    this.scoreText = this.add.text(10, 10, 'Score: 0', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Outfit'
    });

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
  }
  
  private setupTimer() {
    this.timerText = this.add.text(this.cameras.main.width - 10, 10, this.formatTime(this.remainingTime), {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Outfit'
    }).setOrigin(1, 0);

    this.gameTimer = this.time.addEvent({
        delay: 1000,
        callback: this.updateTimer,
        callbackScope: this,
        loop: true
    });
  }
  
  private updateTimer() {
    this.remainingTime--;
    this.timerText.setText(this.formatTime(this.remainingTime));

    if (this.remainingTime <= 0) {
        this.gameTimer.remove();
        this.endGame();
    }
  }
  
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

        const letterTile: LetterTile = { container, text, background, letter };
        
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
    if (this.isRotating) return;

    const letterTile = this.getTileAt(pointer.worldX, pointer.worldY);
    if (letterTile) {
      this.clearSelection();
      this.isSwiping = true;
      this.addLetterToSelection(letterTile);
    }
  }

  private handleSwipeMove(pointer: Phaser.Input.Pointer) {
    if (!this.isSwiping) return;

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
    if (!this.isSwiping) return;
    this.isSwiping = false;
    
    if (this.currentWord.length > 0) {
        this.checkWord();
    }
  }

  private getTileAt(worldX: number, worldY: number): LetterTile | null {
    for (let y = 0; y < this.grid.length; y++) {
        for (let x = 0; x < this.grid[y].length; x++) {
            const tile = this.grid[y][x];
            const bounds = tile.container.getBounds();
            if (bounds.contains(worldX, worldY)) {
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
      this.updateCurrentWordText();
    }
  }
  
  private deselectLastLetter() {
    const lastTile = this.selectedLetters.pop();
    if (lastTile) {
        this.currentWord = this.currentWord.slice(0, -1);
        this.currentPath.pop();
        this.resetTileColor(lastTile);
        this.updateCurrentWordText();
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
        this.updateFoundWordsDisplay();

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
                return;
            }
        }
    }
    
    tile.background.setFillStyle(0xffffff);
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

  private updateCurrentWordText() {
    this.currentWordText.setText(this.currentWord);
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
            }
        } else {
            tile.background.setFillStyle(0xffffff); // Fallback for safety
        }
    });
    this.selectedLetters = [];
    this.updateCurrentWordText();
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

    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  private resetGame() {
    this.setupLevel(1);
  }

  private endGame() {
    this.grid.flat().forEach(tile => tile.container.disableInteractive());
    
    if (this.score >= this.currentGoal) {
        this.feedbackText.setText('Level Complete!').setColor('#00ff00').setDepth(1);
        this.time.delayedCall(2000, () => this.setupLevel(this.currentLevel + 1));
    } else {
        this.feedbackText.setText('Game Over!').setColor('#ff0000').setDepth(1);
        this.time.delayedCall(3000, () => this.resetGame());
    }
  }

  private updateFoundWordsDisplay() {
      this.foundWordsTextGroup.clear(true, true);
      const gridBounds = this.gridContainer.getBounds();
      let yPos = gridBounds.bottom + 40;
      const columns = 5;
      const columnWidth = 80;

      this.foundWords.forEach((word, index) => {
          const xPos = (this.cameras.main.width / 2) - (columnWidth * (columns-1) / 2) + ((index % columns) * columnWidth);
          if (index > 0 && index % columns === 0) {
              yPos += 25;
          }
          const text = this.add.text(xPos, yPos, word, {
              fontSize: '18px',
              color: '#00ffff', // Blue color
              fontFamily: 'Outfit'
          }).setOrigin(0.5);
          this.foundWordsTextGroup.add(text);
      });
  }

  private displayGrid() {
    // The grid is already displayed in createGrid, this is just for clarity
  }

  update() {
    // Game loop
  }
} 