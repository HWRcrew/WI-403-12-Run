var GlobalProperties = {
    GameWidth: 768,
    GameHeight: 384,
    // GameFrameTime in milliseconds
    GameFrameTime: 30,
    GameFriction: 0.8,
};
var playerObject = {
    Name: null,
    Time: 0,
    stunDuration: 0,
    stunTime: 0,
    stunStart: null,
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
    friction: GlobalProperties.GameFriction,
    bounce: -0.7,
    gravity: 0.6,
    isOnGround: undefined,
    jumpForce: -10
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
        if (Players[i].stunStart && Players[i].stunDuration != 0) {
            var stunElapsed = ((new Date() - Players[i].stunStart) / 1000) | 0;
            if (0 < Players[i].stunDuration) {
                // set acceleration to zero
                Players[i].accelerationY = 0;
                Players[i].accelerationX = 0;
                Players[i].vx = 0;
                Players[i].vy = 0;
                Players[i].stunDuration = Players[i].stunTime - stunElapsed;
            } else {
                Players[i].stunTime = 0;
                Players[i].stunDuration = 0;
                Players[i].stunStart = null;
            }
        }
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
        // check for collision Player VS Player
        for (var j = 0; j < Players.length; j++) {
            if (j == i) {
                continue;
            }
            var opponent = Players[j];
            // TODO set bounce to true when bounce is implemented
            var collisionSide = collisionDetection(Players[i], opponent, false);
            // TODO handle collisionside
            if (collisionSide == "bottom") {
                // stun in seconds
                opponent.stunTime = 3;
                opponent.stunDuration = opponent.stunTime;
                opponent.stunStart = new Date();
            }
        }
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
    var combinedHalfWidths = halfWidth(o1) + halfHeight(o2);
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
                    // o1.x = o1.x + overlapX;
                } else {
                    collisionSide = "right";
                    //Move the rectangle out of the collision
                    // o1.x = o1.x - overlapX;
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
        }
    }
};

// Export for server.js
if (typeof exports !== "undefined") {
    exports.GlobalProperties = GlobalProperties;
    exports.playerObject = playerObject;
    exports.RunGameFrame = RunGameFrame;
    exports.centerX = centerX;
}