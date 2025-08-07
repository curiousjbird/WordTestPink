import Phaser from 'phaser';

export type GameSettings = {
    swipeSensitivity: number;
};

export class SettingsManager {
    private scene: Phaser.Scene;
    private settings: GameSettings;
    private settingsModal!: Phaser.GameObjects.Container;
    private isSettingsOpen: boolean = false;

    private onSettingsChanged: (settings: GameSettings) => void;

    constructor(scene: Phaser.Scene, onSettingsChanged: (settings: GameSettings) => void) {
        this.scene = scene;
        this.onSettingsChanged = onSettingsChanged;
        this.settings = this.loadSettings();
    }

    public getSettings(): GameSettings {
        return this.settings;
    }

    private loadSettings(): GameSettings {
        const savedSettings = localStorage.getItem('wordgame-settings');
        const defaultSettings: GameSettings = { swipeSensitivity: 0.25 };

        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                return { ...defaultSettings, ...parsed };
            } catch (e) {
                console.warn('Failed to load settings:', e);
                return defaultSettings;
            }
        }
        return defaultSettings;
    }

    private saveSettings(newSettings: GameSettings) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem('wordgame-settings', JSON.stringify(this.settings));
        this.onSettingsChanged(this.settings);
    }

    public openSettings() {
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
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;

        const tempSettings = { ...this.settings };

        const overlay = this.scene.add.rectangle(
            -centerX, -centerY,
            this.scene.cameras.main.width, this.scene.cameras.main.height,
            0x000000, 0.7
        );

        const modalBg = this.scene.add.rectangle(0, 0, modalWidth, modalHeight, 0xffffff);
        modalBg.setStrokeStyle(2, 0x333333);

        const title = this.scene.add.text(0, -modalHeight / 2 + 40, 'Settings', {
            fontSize: '28px', color: '#000000', fontFamily: 'Outfit', fontStyle: 'bold'
        }).setOrigin(0.5);

        const closeX = this.scene.add.text(modalWidth / 2 - 20, -modalHeight / 2 + 20, '✕', {
            fontSize: '24px', color: '#666666', fontFamily: 'Outfit'
        }).setOrigin(0.5);
        closeX.setInteractive();
        closeX.on('pointerdown', () => this.closeSettings());

        const sensitivityLabel = this.scene.add.text(0, -60, 'Swipe Sensitivity', {
            fontSize: '20px', color: '#000000', fontFamily: 'Outfit'
        }).setOrigin(0.5);

        const sliderTrackWidth = 250;
        const sliderTrack = this.scene.add.rectangle(0, -20, sliderTrackWidth, 6, 0xcccccc);

        const currentValue = (tempSettings.swipeSensitivity - 0.05) / (0.75 - 0.05);
        const handleX = (currentValue - 0.5) * sliderTrackWidth;
        const sliderHandle = this.scene.add.circle(handleX, -20, 12, 0x0066cc);
        sliderHandle.setInteractive({ useHandCursor: true });
        this.scene.input.setDraggable(sliderHandle);

        const sensitivityValue = this.scene.add.text(0, 20, `${(tempSettings.swipeSensitivity * 100).toFixed(0)}%`, {
            fontSize: '16px', color: '#666666', fontFamily: 'Outfit'
        }).setOrigin(0.5);

        sliderHandle.on('drag', (dragX: number) => {
            const clampedX = Phaser.Math.Clamp(dragX, -sliderTrackWidth/2, sliderTrackWidth/2);
            sliderHandle.x = clampedX;

            const normalizedValue = (clampedX + sliderTrackWidth/2) / sliderTrackWidth;
            tempSettings.swipeSensitivity = 0.05 + normalizedValue * (0.75 - 0.05);
            sensitivityValue.setText(`${(tempSettings.swipeSensitivity * 100).toFixed(0)}%`);
        });

        const saveButton = this.scene.add.rectangle(-80, modalHeight / 2 - 40, 100, 40, 0x28a745);
        const saveText = this.scene.add.text(-80, modalHeight / 2 - 40, 'Save', {
            fontSize: '18px', color: '#ffffff', fontFamily: 'Outfit'
        }).setOrigin(0.5);
        saveButton.setInteractive({ useHandCursor: true });
        saveButton.on('pointerdown', () => {
            this.saveSettings(tempSettings);
            this.closeSettings();
        });

        const cancelButton = this.scene.add.rectangle(80, modalHeight / 2 - 40, 100, 40, 0x6c757d);
        const cancelText = this.scene.add.text(80, modalHeight / 2 - 40, 'Cancel', {
            fontSize: '18px', color: '#ffffff', fontFamily: 'Outfit'
        }).setOrigin(0.5);
        cancelButton.setInteractive({ useHandCursor: true });
        cancelButton.on('pointerdown', () => this.closeSettings());

        this.settingsModal = this.scene.add.container(centerX, centerY, [
            overlay, modalBg, title, closeX, sensitivityLabel,
            sliderTrack, sliderHandle, sensitivityValue,
            saveButton, saveText, cancelButton, cancelText
        ]);
        this.settingsModal.setDepth(1000);
    }

    public isModalOpen(): boolean {
        return this.isSettingsOpen;
    }
}
