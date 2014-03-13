var GlobalProperties = {
    GameWidth: 768,
    GameHeight: 384,
    // GameFrameTime in milliseconds
    GameFrameTime: 30,
};
var playerObject = {
    Name: null,
    Time: 0,
    // values for getting image from spritesheet
    sourceX: 0,
    sourceY: 0,
    sourceWidth: 0,
    sourceHeight: 0,
    // size in the game
    width: 32,
    height: 47,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    // physical properties
    accelerationX: 0,
    accelerationY: 0,
    speedLimit: 5,
    friction: 0.6,
    bounce: -0.7,
    gravity: 0.6,
    isOnGround: undefined,
    jumpForce: -10,
    // some getters
    centerX: function() {
        return this.x + (this.width / 2);
    },
    centerY: function() {
        return this.y + (this.height / 2);
    },
    halfWidth: function() {
        return this.width / 2;
    },
    halfHeight: function() {
        return this.height / 2;
    }
};

// TODO fix run-bug

// TODO RunGameFrame
function RunGameFrame(Players) {
    for (var i = 0; i < Players.length; i++) {
        // Apply the acceleration
        Players[i].vx += Players[i].accelerationX;
        Players[i].vy += Players[i].accelerationY;
        // Apply friction
        if (Players[i].isOnGround) {
            Players[i].vx *= Players[i].friction;
        }
        // Apply gravity
        if (!Players[i].isOnGround) {
            Players[i].vy += Players[i].gravity;
        }
        // Speedlimit Acceleration has to be applied before this one
        if (Players[i].vx > Players[i].speedLimit) {
            Players[i].vx = Players[i].speedLimit;
        }
        if (Players[i].vx < -Players[i].speedLimit) {
            Players[i].vx = -Players[i].speedLimit;
        }
        if (Players[i].vy > Players[i].speedLimit * 2) {
            Players[i].vy = Players[i].speedLimit * 2;
        }
        // move Player | apply velocity to player
        Players[i].x += Players[i].vx;
        Players[i].y += Players[i].vy;

        // Limit for Canvas and bounce effect
        // Left
        if (Players[i].x < 0) {
            Players[i].vx *= Players[i].bounce;
            Players[i].x = 0;
        }
        //Top
        if (Players[i].y < 0) {
            Players[i].vy *= Players[i].bounce;
            Players[i].y = 0;
        }
        //Right
        if ((Players[i].x + Players[i].width) > GlobalProperties.GameWidth) {
            Players[i].vx *= Players[i].bounce;
            Players[i].x = GlobalProperties.GameWidth - Players[i].width;
        }
        //Bottom
        if ((Players[i].y + Players[i].height) > GlobalProperties.GameHeight) {
            // repositioning
            Players[i].y = GlobalProperties.GameHeight - Players[i].height;
            Players[i].isOnGround = true;
            Players[i].vy = 0;
        }
    }
};

// Export for server.js
if (typeof exports !== "undefined") {
    exports.GlobalProperties = GlobalProperties;
    exports.playerObject = playerObject;
    exports.RunGameFrame = RunGameFrame;
}