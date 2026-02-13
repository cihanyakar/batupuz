export const EventBus = new Phaser.Events.EventEmitter();

export const Events = {
    // Game events
    FRUIT_DROPPED:     'fruit:dropped',
    FRUIT_MERGED:      'fruit:merged',
    SCORE_CHANGED:     'score:changed',
    NEXT_FRUIT_CHOSEN: 'next:chosen',
    GAME_OVER:         'game:over',
    GAME_RESTART:      'game:restart',
    DROP_READY:        'drop:ready',

    // Network events
    NET_JOINED:        'net:joined',
    NET_GAME_START:    'net:gameStart',
    NET_DROP:          'net:drop',
    NET_AUTO_DROP:     'net:autoDrop',
    NET_NEW_FRUIT:     'net:newFruit',
    NET_TIMER:         'net:timer',
    NET_CURSOR:        'net:cursor',
    NET_GAME_OVER:     'net:gameOver',
    NET_RESTART:       'net:restart',
    NET_PLAYER_LEFT:   'net:playerLeft',
    NET_ERROR:         'net:error',
    NET_DISCONNECTED:  'net:disconnected',
    NET_WORLD_STATE:   'net:worldState',
    NET_MERGE:         'net:merge',
    NET_DESTROY:       'net:destroy',
};
