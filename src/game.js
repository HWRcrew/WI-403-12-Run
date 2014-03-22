/* ISSUES
 *
 */
// network connection seems to be not that fast any more??? too many data?
// when you fall down and try to walk you get bounced off, maybe because of the drop in the block and then the collision comes before the offset

var GP = {
    GameWidth: 768,
    GameHeight: 384,
    // GameFrameTime in milliseconds
    GameFrameTime: 30,
    GameFriction: 0.8,
    GameGravity: 0.6,
    GameBounce: -0.7,
    GameStunTime: 2,
    GameJumpForce: -10,
    GameSpeedLimit: 5
};
// Stores Players[], collsionObjects[], killObject[], goalObjects[] and otherObjects[]
var Sprites = {};
var spriteObject = {
    // properties for everyone
    sourceX: 0,
    sourceY: 0,
    sourceWidth: 32,
    sourceHeight: 32,
    width: 32,
    height: 32,
    x: 0,
    y: 0,
    // properties for moving objects
    vx: 0,
    vy: 0,
    accelerationX: 0,
    accelerationY: 0,
    friction: GP.GameFriction,
    // gravity: GP.GameGravity,
    isOnGround: undefined,
    Name: null,
    // Time for a one maprun in seconds
    // TODO hold on Connection?
    Time: 0,
    // stunDuration in seconds
    // TODO find better solution
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
function RunGameFrame(Sprites) {
    for (var i = 0; i < Sprites.Players.length; i++) {
        var CurrentPlayer = Sprites.Players[i];
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
        CurrentPlayer.vy += GP.GameGravity;
        // Speedlimit Acceleration has to be applied before this one
        if (CurrentPlayer.vx > GP.GameSpeedLimit) {
            CurrentPlayer.vx = GP.GameSpeedLimit;
        }
        if (CurrentPlayer.vx < -GP.GameSpeedLimit) {
            CurrentPlayer.vx = -GP.GameSpeedLimit;
        }
        if (CurrentPlayer.vy > GP.GameSpeedLimit * 2) {
            CurrentPlayer.vy = GP.GameSpeedLimit * 2;
        }
        // move Player | apply velocity to player
        CurrentPlayer.x += CurrentPlayer.vx;
        CurrentPlayer.y += CurrentPlayer.vy;
        // apply offset
        // TODO replace simple solution
        CurrentPlayer.offsetX += CurrentPlayer.vx;
        // CurrentPlayer.offsetY += CurrentPlayer.vy;
        // check for collision Player VS Player
        for (var j = 0; j < Sprites.Players.length; j++) {
            if (j == i) {
                continue;
            }
            var opponent = Sprites.Players[j];
            var collisionSide = collisionDetection(CurrentPlayer, opponent, true);
            // TODO handle collisionside
            if (collisionSide == "bottom") {
                // stun in seconds
                opponent.stunTime = GP.GameStunTime;
                opponent.stunDuration = opponent.stunTime;
                opponent.stunStart = new Date();
            }
        }
        // check for collision with collisionObjects
        for (var j = 0; j < Sprites.realCollisionObjects.length; j++) {
            var cObject = Sprites.realCollisionObjects[j];
            var collisionSide = collisionDetection(CurrentPlayer, cObject, true);
            switch (collisionSide) {
                case "top":
                    CurrentPlayer.vy = 0;
                    break;
                case "bottom":
                    CurrentPlayer.isOnGround = true;
                    CurrentPlayer.vy = -GP.GameGravity;
                    break;
                case "left":
                    break;
                case "right":
                    break;
                default:
                    break;
            }
        }
        // Limit for Canvas and bounce effect
        // Left
        if (CurrentPlayer.x < 0) {
            CurrentPlayer.vx *= GP.GameBounce;
            CurrentPlayer.x = 0;
        }
        //Top
        if (CurrentPlayer.y < 0) {
            CurrentPlayer.vy *= GP.GameBounce;
            CurrentPlayer.y = 0;
        }
        //Right
        if ((CurrentPlayer.x + CurrentPlayer.width) > GP.GameWidth) {
            CurrentPlayer.vx *= GP.GameBounce;
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
                    o1.vx *= GP.GameBounce;
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

// Export for server.js
if (typeof exports !== "undefined") {
    exports.GP = GP;
    exports.spriteObject = spriteObject;
    exports.RunGameFrame = RunGameFrame;
}