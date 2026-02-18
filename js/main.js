import { BootScene } from './scenes/BootScene.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 600,
    height: 780,
    backgroundColor: '#6858a8',
    pixelArt: false,
    antialias: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1.5 },
            debug: false,
        }
    },
    scene: [BootScene, LobbyScene, GameScene, UIScene],
};

window._game = new Phaser.Game(config);

window.addEventListener('resize', () => {
    window._game.scale.refresh();
});
