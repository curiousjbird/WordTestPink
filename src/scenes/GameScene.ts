import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private grid: Phaser.GameObjects.Text[][] = [];
  private letterFrequencies = {
    E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1, R: 6.0,
    D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0,
    P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.2, X: 0.2, Q: 0.1, Z: 0.1,
  };
  private weightedLetters: string[] = [];
  private currentWord: string = '';
  private currentPath: { x: number; y: number }[] = [];
  private selectedLetters: Phaser.GameObjects.Text[] = [];
  private currentWordText!: Phaser.GameObjects.Text;
  private wordList: string[] = [];
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private foundWords: string[] = [];
  private foundWordsTextGroup!: Phaser.GameObjects.Group;

  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.text('wordList', 'assets/words_english.txt');
  }

  create() {
    this.wordList = this.cache.text.get('wordList').split('\n').map((s: string) => s.trim().toUpperCase());

    this.createWeightedLetters();
    this.createGrid();
    this.displayGrid();

    this.foundWordsTextGroup = this.add.group();

    this.currentWordText = this.add.text(10, 10, 'Word: ', {
      fontSize: '32px',
      color: '#ffffff',
    });

    this.scoreText = this.add.text(10, 50, 'Score: 0', {
      fontSize: '32px',
      color: '#ffffff',
    });

    this.feedbackText = this.add.text(this.cameras.main.width / 2, 120, '', {
      fontSize: '24px',
      color: '#ff0000',
    }).setOrigin(0.5);

    const submitButton = this.add.text(this.cameras.main.width / 2 + 80, this.cameras.main.height - 50, 'Submit', {
      fontSize: '32px',
      color: '#00ff00',
    }).setOrigin(0.5).setInteractive();

    submitButton.on('pointerdown', () => this.submitWord());
    if (submitButton.input) {
      submitButton.input.hitArea.setTo(-50, -20, 100, 40);
    }

    const clearButton = this.add.text(this.cameras.main.width / 2 - 80, this.cameras.main.height - 50, 'Clear', {
        fontSize: '32px',
        color: '#ffff00',
    }).setOrigin(0.5).setInteractive();

    clearButton.on('pointerdown', () => this.clearSelection());
    if (clearButton.input) {
      clearButton.input.hitArea.setTo(-50, -20, 100, 40);
    }
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

  private createGrid() {
    for (let y = 0; y < 5; y++) {
      this.grid[y] = [];
      for (let x = 0; x < 5; x++) {
        const letter = this.getRandomLetter();
        const xPos = 100 + x * 50;
        const yPos = 200 + y * 50;
        const text = this.add.text(xPos, yPos, letter, {
          fontSize: '32px',
          color: '#ffffff',
        }).setOrigin(0.5).setInteractive();

        text.on('pointerdown', () => this.onLetterClicked(text, x, y));
        
        // Increase hit area for better touch sensitivity
        if (text.input) {
          text.input.hitArea.setTo(-25, -25, 50, 50);
        }

        this.grid[y][x] = text;
      }
    }
  }

  private onLetterClicked(letter: Phaser.GameObjects.Text, x: number, y: number) {
    if (this.isValidSelection(x, y)) {
      this.currentWord += letter.text;
      this.currentPath.push({ x, y });
      this.selectedLetters.push(letter);
      letter.setColor('#ff0000');
      this.updateCurrentWordText();
    }
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

  private updateCurrentWordText() {
    this.currentWordText.setText(`Word: ${this.currentWord}`);
  }

  private submitWord() {
    const word = this.currentWord;

    if (word.length < 3) {
        this.feedbackText.setText('Word must be at least 3 letters').setColor('#ff0000');
        this.time.delayedCall(1000, () => this.feedbackText.setText(''));
        this.clearSelection();
        return;
    }

    if (this.foundWords.includes(word)) {
        this.feedbackText.setText('Already found!').setColor('#ffff00');
        this.time.delayedCall(1000, () => this.feedbackText.setText(''));
        this.clearSelection();
        return;
    }

    if (this.wordList.includes(word)) {
      this.feedbackText.setText('Valid Word!').setColor('#00ff00');
      this.foundWords.push(word);
      this.updateScore();
      this.updateFoundWordsDisplay();
    } else {
      this.feedbackText.setText('Invalid Word').setColor('#ff0000');
    }

    this.time.delayedCall(1000, () => this.feedbackText.setText(''));
    this.clearSelection();
  }

  private clearSelection() {
    this.currentWord = '';
    this.currentPath = [];
    this.selectedLetters.forEach(letter => letter.setColor('#ffffff'));
    this.selectedLetters = [];
    this.updateCurrentWordText();
  }

  private updateScore() {
    const len = this.currentWord.length;
    let points = 0;
    if (len === 3) points = 1;
    else if (len === 4) points = 3;
    else if (len === 5) points = 5;
    else if (len === 6) points = 9;
    else if (len > 6) points = 9 + (len - 6);

    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);

    if (this.score >= 20) {
        this.feedbackText.setText('Game Over!').setColor('#00ff00');
        this.time.delayedCall(3000, () => this.resetGame());
    }
  }

  private resetGame() {
    this.score = 0;
    this.scoreText.setText('Score: 0');
    this.foundWords = [];
    this.foundWordsTextGroup.clear(true, true);
    this.feedbackText.setText('');

    this.grid.flat().forEach(letter => letter.destroy());
    this.grid = [];

    this.createGrid();
  }

  private updateFoundWordsDisplay() {
      this.foundWordsTextGroup.clear(true, true);
      let yPos = 450;
      this.foundWords.forEach((word, index) => {
          const xPos = 100 + (index % 4) * 90;
          if (index > 0 && index % 4 === 0) {
              yPos += 30;
          }
          const text = this.add.text(xPos, yPos, word, {
              fontSize: '24px',
              color: '#00ffff' // Blue color
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