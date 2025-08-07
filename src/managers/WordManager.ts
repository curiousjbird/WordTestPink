import { GameStateManager } from './GameStateManager';

export class WordManager {
    private wordList: Set<string>;
    private hiddenWordsList: string[];
    private placedWords: { word: string, path: {x: number, y: number}[] }[] = [];

    constructor(
        wordList: string[],
        hiddenWordsList: string[]
    ) {
        this.wordList = new Set(wordList);
        this.hiddenWordsList = hiddenWordsList;
    }

    public getHiddenWords(): string[] {
        return this.hiddenWordsList;
    }

    public getPlacedWords(): { word: string, path: {x: number, y: number}[] }[] {
        return this.placedWords;
    }

    public addPlacedWord(word: string, path: {x: number, y: number}[]) {
        this.placedWords.push({ word, path });
    }

    public clearPlacedWords() {
        this.placedWords = [];
    }

    public isValidWord(word: string): boolean {
        return this.wordList.has(word);
    }

    public isHiddenWord(word: string): boolean {
        return this.placedWords.some(p => p.word === word);
    }
}
