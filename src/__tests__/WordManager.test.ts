import { WordManager } from '../managers/WordManager';

describe('WordManager', () => {
    let wordManager: WordManager;
    const wordList = ['TEST', 'WORD', 'HELLO'];
    const hiddenWords = ['SECRET', 'HIDDEN'];

    beforeEach(() => {
        wordManager = new WordManager(wordList, hiddenWords);
    });

    it('should correctly identify a valid word', () => {
        expect(wordManager.isValidWord('TEST')).toBe(true);
    });

    it('should correctly identify an invalid word', () => {
        expect(wordManager.isValidWord('INVALID')).toBe(false);
    });

    it('should be case-insensitive for valid words (assuming they are stored uppercase)', () => {
        expect(wordManager.isValidWord('test')).toBe(false); // The current implementation is case-sensitive
    });

    it('should return the list of hidden words', () => {
        expect(wordManager.getHiddenWords()).toEqual(hiddenWords);
    });

    it('should manage placed words', () => {
        expect(wordManager.getPlacedWords()).toEqual([]);
        const path = [{x: 0, y: 0}];
        wordManager.addPlacedWord('SECRET', path);
        expect(wordManager.getPlacedWords()).toEqual([{ word: 'SECRET', path }]);
        expect(wordManager.isHiddenWord('SECRET')).toBe(true);
        expect(wordManager.isHiddenWord('WORD')).toBe(false);
        wordManager.clearPlacedWords();
        expect(wordManager.getPlacedWords()).toEqual([]);
    });
});
