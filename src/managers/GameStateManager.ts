export class GameStateManager {
    private _score: number = 0;
    private _level: number = 1;
    private _goal: number = 0;
    private _foundWords: string[] = [];

    constructor(startLevel: number = 1) {
        this._level = startLevel;
    }

    public get score(): number {
        return this._score;
    }

    public get level(): number {
        return this._level;
    }

    public get goal(): number {
        return this._goal;
    }

    public get foundWords(): string[] {
        return this._foundWords;
    }

    public setGoal(goal: number) {
        this._goal = goal;
    }

    public addScore(points: number) {
        this._score += points;
    }

    public isWordFound(word: string): boolean {
        return this._foundWords.includes(word);
    }

    public addFoundWord(word: string) {
        if (!this.isWordFound(word)) {
            this._foundWords.push(word);
        }
    }

    public checkGoalReached(): boolean {
        return this._score >= this._goal;
    }

    public advanceLevel() {
        this._level++;
    }

    public resetForNewLevel() {
        this._score = 0;
        this._foundWords = [];
        this._goal = 0;
    }
}
