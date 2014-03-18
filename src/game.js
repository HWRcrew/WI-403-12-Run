var GP = {
    GameWidth: 768,
    GameHeight: 384,
    // GameFrameTime in milliseconds
    GameFrameTime: 30,
    GameFriction: 0.8,
    GameGravity: 0.3,
    GameBounce: -0.7,
    GameStun: 2,
    GameJumpForce: -10
};
// Stores Players[], collsionObjects[], killObject[], goalObjects[] and Other[]
var Sprites = {};
var spriteObject = {
    // properties for everyone
    sourceX: 0,
    sourceY: 0,
    sourceWidth: 0,
    sourceHeight: 0,
    width: 32,
    height: 32,
    x: 0,
    y: 0,
    // properties for moving objects
    vx: 0,
    vy: 0,
    // properties for players
    accelerationX: 0,
    accelerationY: 0,
    speedLimit: 5,
    friction: GP.GameFriction,
    bounce: GP.GameBounce,
    gravity: GP.GameGravity,
    isOnGround: undefined,
    jumpForce: GP.GameJumpForce,
    Name: null,
    // Time for a maprun in seconds
    Time: 0,
    // stunDuration in seconds
    stunDuration: 0,
    stunTime: 0,
    stunStart: null
};
// getters for objects
var centerX = function(object) {
    return object.x + (object.width / 2);
};
var centerY = function(object) {
    return object.y + (object.height / 2);
};
var halfWidth = function(object) {
    return object.width / 2;
};
var halfHeight = function(object) {
    return object.height / 2;
};
// TODO RunGameFrame
function RunGameFrame(Players) {
    for (var i = 0; i < Players.length; i++) {
        var CurrentPlayer = Players[i];
        if (CurrentPlayer.stunStart && CurrentPlayer.stunDuration != 0) {
            var stunElapsed = ((new Date() - CurrentPlayer.stunStart) / 1000) | 0;
            if (0 < CurrentPlayer.stunDuration) {
                // set acceleration to zero
                CurrentPlayer.accelerationY = 0;
                CurrentPlayer.accelerationX = 0;
                CurrentPlayer.vx = 0;
                CurrentPlayer.vy = 0;
                CurrentPlayer.stunDuration = CurrentPlayer.stunTime - stunElapsed;
            } else {
                CurrentPlayer.stunTime = 0;
                CurrentPlayer.stunDuration = 0;
                CurrentPlayer.stunStart = null;
            }
        }
        // Apply the acceleration
        CurrentPlayer.vx += CurrentPlayer.accelerationX;
        CurrentPlayer.vy += CurrentPlayer.accelerationY;
        // Apply friction
        if (CurrentPlayer.isOnGround) {
            CurrentPlayer.vx *= CurrentPlayer.friction;
        }
        // Apply gravity
        if (!CurrentPlayer.isOnGround) {
            CurrentPlayer.vy += CurrentPlayer.gravity;
        }
        // Speedlimit Acceleration has to be applied before this one
        if (CurrentPlayer.vx > CurrentPlayer.speedLimit) {
            CurrentPlayer.vx = CurrentPlayer.speedLimit;
        }
        if (CurrentPlayer.vx < -CurrentPlayer.speedLimit) {
            CurrentPlayer.vx = -CurrentPlayer.speedLimit;
        }
        if (CurrentPlayer.vy > CurrentPlayer.speedLimit * 2) {
            CurrentPlayer.vy = CurrentPlayer.speedLimit * 2;
        }
        // move Player | apply velocity to player
        CurrentPlayer.x += CurrentPlayer.vx;
        CurrentPlayer.y += CurrentPlayer.vy;
        // check for collision Player VS Player
        for (var j = 0; j < Players.length; j++) {
            if (j == i) {
                continue;
            }
            var opponent = Players[j];
            // TODO set bounce to true when bounce is implemented
            var collisionSide = collisionDetection(CurrentPlayer, opponent, false);
            // TODO handle collisionside
            if (collisionSide == "bottom") {
                // stun in seconds
                opponent.stunTime = GP.GameStun;
                opponent.stunDuration = opponent.stunTime;
                opponent.stunStart = new Date();
            }
        }
        // Limit for Canvas and bounce effect
        // Left
        if (CurrentPlayer.x < 0) {
            CurrentPlayer.vx *= CurrentPlayer.bounce;
            CurrentPlayer.x = 0;
        }
        //Top
        if (CurrentPlayer.y < 0) {
            CurrentPlayer.vy *= CurrentPlayer.bounce;
            CurrentPlayer.y = 0;
        }
        //Right
        if ((CurrentPlayer.x + CurrentPlayer.width) > GP.GameWidth) {
            CurrentPlayer.vx *= CurrentPlayer.bounce;
            CurrentPlayer.x = GP.GameWidth - CurrentPlayer.width;
        }
        //Bottom
        if ((CurrentPlayer.y + CurrentPlayer.height) > GP.GameHeight) {
            // repositioning
            CurrentPlayer.y = GP.GameHeight - CurrentPlayer.height;
            CurrentPlayer.isOnGround = true;
            CurrentPlayer.vy = 0;
        }
    }
};
/**
 * Detect collisionSide between two objects
 * @return collisionSide
 */
function collisionDetection(o1, o2, bounce) {
    if (typeof bounce === "undefined") {
        bounce = false;
    }
    var collisionSide = "";
    // distance vector
    var vectorX = centerX(o1) - centerX(o2);
    var vectorY = centerY(o1) - centerY(o2);
    // combined half-widths and half-heights
    var combinedHalfWidths = halfWidth(o1) + halfWidth(o2);
    var combinedHalfHeights = halfHeight(o1) + halfHeight(o2);
    // check for collision side
    if (Math.abs(vectorX) < combinedHalfWidths) {
        // a collision might be occurring
        if (Math.abs(vectorY) < combinedHalfHeights) {
            // collision occured
            // find out the overlap size
            var overlapX = combinedHalfWidths - Math.abs(vectorX);
            var overlapY = combinedHalfHeights - Math.abs(vectorY);
            // collision occured on the axis with smallest amount of overlap
            if (overlapX >= overlapY) {
                // collision on X-Axis
                if (vectorY > 0) {
                    collisionSide = "top";
                    //Move the rectangle out of the collision
                    o1.y = o1.y + overlapY;
                } else {
                    collisionSide = "bottom";
                    //Move the rectangle out of the collision
                    o1.y = o1.y - overlapY;
                    o1.isOnGround = true;
                }
                if (bounce) {
                    // TODO implement bounce on collision
                }
            } else {
                // collision on Y-Axis
                if (vectorX > 0) {
                    collisionSide = "left";
                    //Move the rectangle out of the collision
                    o1.x = o1.x + overlapX;
                } else {
                    collisionSide = "right";
                    //Move the rectangle out of the collision
                    o1.x = o1.x - overlapX;
                }
                if (bounce) {
                    // TODO implement bounce on collision
                }
            }
        } else {
            collisionSide = "none";
        }
    } else {
        collisionSide = "none";
    }
    return collisionSide;
}
/**
 * MapCode
 */
var EMPTY = 0;

//TODO: Namen für Variablen herausfinden!
var BLOCK1 = 1;
var BLOCK2 = 41;
var BLOCK3 = 42;
var BlOCK4 = 43;
var BLOCK5 = 44;
var BLOCK6 = 45;
var BLOCK7 = 46;
var BLOCK8 = 47;
var BLOCK9 = 48;


var collisionObjects = [];
var killObjects = [];

/**
 * mapbuilder
 */
function buildMap(mapArray) {
    var ROWS = mapArray.length;
    var COLUMNS = mapArray[0].length;
    for (var row = 0; row < ROWS; row++) {
        for (var column = 0; column < COLUMNS; column++) {
            var currentTile = mapArray[row][column];
            if (currentTile == EMPTY) {
                continue;
            }
            // TODO build map
            if (currentTile == BLOCK1) {
                var BLOCK1 = Object.create(spriteObject);
                BLOCK1.sourceX = tileSheetX;
                BLOCK1.sourceY = tileSheetY;
                BLOCK1.x = column * SIZE;
                BLOCK1.y = row * SIZE;
                sprites.push(BLOCK1);
            }
        }
    }
};

// Export for server.js
if (typeof exports !== "undefined") {
    exports.GP = GP;
    exports.spriteObject = spriteObject;
    exports.RunGameFrame = RunGameFrame;
}