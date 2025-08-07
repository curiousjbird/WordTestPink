import { GameStateManager } from '../managers/GameStateManager';

describe('GameStateManager', () => {
    let gameStateManager: GameStateManager;

    beforeEach(() => {
        gameStateManager = new GameStateManager();
    });

    it('should initialize with default values', () => {
        expect(gameStateManager.score).toBe(0);
        expect(gameStateManager.level).toBe(1);
        expect(gameStateManager.goal).toBe(0);
        expect(gameStateManager.foundWords).toEqual([]);
    });

    it('should initialize with a specific start level', () => {
        gameStateManager = new GameStateManager(5);
        expect(gameStateManager.level).toBe(5);
    });

    it('should set the goal', () => {
        gameStateManager.setGoal(100);
        expect(gameStateManager.goal).toBe(100);
    });

    it('should add to the score', () => {
        gameStateManager.addScore(10);
        expect(gameStateManager.score).toBe(10);
        gameStateManager.addScore(5);
        expect(gameStateManager.score).toBe(15);
    });

    it('should add a found word only once', () => {
        gameStateManager.addFoundWord('TEST');
        expect(gameStateManager.foundWords).toEqual(['TEST']);
        gameStateManager.addFoundWord('TEST');
        expect(gameStateManager.foundWords).toEqual(['TEST']);
    });

    it('should check if a word has been found', () => {
        expect(gameStateManager.isWordFound('TEST')).toBe(false);
        gameStateManager.addFoundWord('TEST');
        expect(gameStateManager.isWordFound('TEST')).toBe(true);
    });

    it('should check if the goal has been reached', () => {
        gameStateManager.setGoal(100);
        gameStateManager.addScore(50);
        expect(gameStateManager.checkGoalReached()).toBe(false);
        gameStateManager.addScore(50);
        expect(gameStateManager.checkGoalReached()).toBe(true);
    });

    it('should advance to the next level', () => {
        gameStateManager.advanceLevel();
        expect(gameStateManager.level).toBe(2);
    });

    it('should reset for a new level', () => {
        gameStateManager.setGoal(100);
        gameStateManager.addScore(50);
        gameStateManager.addFoundWord('TEST');
        gameStateManager.resetForNewLevel();
        expect(gameStateManager.score).toBe(0);
        expect(gameStateManager.goal).toBe(0);
        expect(gameStateManager.foundWords).toEqual([]);
    });
});
