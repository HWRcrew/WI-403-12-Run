/* ISSUES
 *
 */
// network connection seems to be not that fast any more??? too many data?

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
        // Apply gravity always
        CurrentPlayer.vy += CurrentPlayer.gravity;
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
            var collisionSide = collisionDetection(CurrentPlayer, opponent, true);
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
                    o1.vy = 0;
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
                // bounce back when moving against second object
                if (bounce) {
                    o1.vx *= o1.bounce;
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
var GROUNDROUND = 1;
var GROUNDLEFTROUND = 2;
var GROUNDSTRAIGHT = 3;
var GROUNDRIGHTROUND = 4;
var EXIT = 5;
var DOORBOTTOM = 6;
var DOORTOP = 7;
var WATER = 8;
var ARROW = 9;


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

            var tileSheetX = Math.floor((currentTile - 1) % tilesheetColumns) * SIZE;
            var tileSheetY = Math.floor((currentTile - 1) / tilesheetColumns) * SIZE;

            // TODO build map
            if (currentTile == GROUNDROUND) {
                var groundround = Object.create(spriteObject);
                groundround.sourceX = tileSheetX;
                groundround.sourceY = tileSheetY;
                groundround.x = column * SIZE;
                groundround.y = row * SIZE;
                sprites.push(groundround);
            }
            if (currentTile == GROUNDLEFTROUND) {
                var groundleftround = Object.create(spriteObject);
                groundleftround.sourceX = tileSheetX;
                groundleftround.sourceY = tileSheetY;
                groundleftround.x = column * SIZE;
                groundleftround.y = row * SIZE;
                sprites.push(groundleftround);
            }
            if (currentTile == GROUNDSTRAIGHT) {
                var groundstraight = Object.create(spriteObject);
                groundstraight.sourceX = tileSheetX;
                groundstraight.sourceY = tileSheetY;
                groundstraight.x = column * SIZE;
                groundstraight.y = row * SIZE;
                sprites.push(groundstraight);
            }
            if (currentTile == GROUNDRIGHTROUND) {
                var groundrightround = Object.create(spriteObject);
                groundrightround.sourceX = tileSheetX;
                groundrightround.sourceY = tileSheetY;
                groundrightround.x = column * SIZE;
                groundrightround.y = row * SIZE;
                sprites.push(groundrightround);
            }
            if (currentTile == EXIT) {
                var exit = Object.create(spriteObject);
                exit.sourceX = tileSheetX;
                exit.sourceY = tileSheetY;
                exit.x = column * SIZE;
                exit.y = row * SIZE;
                sprites.push(exit);
            }
            if (currentTile == DOORBOTTOM) {
                var doorbottom = Object.create(spriteObject);
                doorbottom.sourceX = tileSheetX;
                doorbottom.sourceY = tileSheetY;
                doorbottom.x = column * SIZE;
                doorbottom.y = row * SIZE;
                sprites.push(doorbottom);
            }
            if (currentTile == DOORTOP) {
                var doortop = Object.create(spriteObject);
                doortop.sourceX = tileSheetX;
                doortop.sourceY = tileSheetY;
                doortop.x = column * SIZE;
                doortop.y = row * SIZE;
                sprites.push(doortop);
            }
            if (currentTile == WATER) {
                var water = Object.create(spriteObject);
                water.sourceX = tileSheetX;
                water.sourceY = tileSheetY;
                water.x = column * SIZE;
                water.y = row * SIZE;
                sprites.push(water);
            }
            if (currentTile == ARROW) {
                var arrow = Object.create(spriteObject);
                arrow.sourceX = tileSheetX;
                arrow.sourceY = tileSheetY;
                arrow.x = column * SIZE;
                arrow.y = row * SIZE;
                sprites.push(arrow);
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