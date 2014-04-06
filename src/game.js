var GP = {
    // GameFrameTime in milliseconds
    GameBlockSize: 32,
    GameFrameTime: 30,
    GameFriction: 0.8,
    GameGravity: 0.7,
    GameBounce: -0.7,
    GameStunTime: 2,
    GameJumpForce: -12,
    GameSpeedLimit: 5,
    tileBlockSize: 32,
    tileColumns: 9
};

// Stores Players[], collsionObjects[], killObject[], goalObjects[] otherObjects[] and backObjects[]
var Sprites = {};

function spriteObject() {
    // properties for everyone
    this.sourceX = 0,
    this.sourceY = 0,
    this.sourceWidth = 32,
    this.sourceHeight = 32,
    this.width = 32,
    this.height = 32,
    this.x = 0,
    this.y = 0,
    // properties for moving objects
    this.vx = 0,
    this.vy = 0,
    this.accelerationX = 0,
    this.accelerationY = 0,
    this.friction = GP.GameFriction,
    this.isOnGround = undefined,
    this.Name = null,
    // number from 1 to 4 for the colors
    this.Col = null,
    // Time for a one maprun in seconds
    // TODO store at Connection?
    this.Time = null,
    this.Timer = false,
    // stunDuration in seconds
    this.stunDuration = 0,
    this.stunTime = 0,
    this.stunStart = null
};
// getters for objects
var centerX = function (object) {
    return object.x + (object.width / 2);
};
var centerY = function (object) {
    return object.y + (object.height / 2);
};
var halfWidth = function (object) {
    return object.width / 2;
};
var halfHeight = function (object) {
    return object.height / 2;
};

var startTime = null;
var counter = null;

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
        // round velocity
        CurrentPlayer.vx = Number((CurrentPlayer.vx).toFixed(3));
        CurrentPlayer.vy = Number((CurrentPlayer.vy).toFixed(3));

        // move Player | apply velocity to player
        CurrentPlayer.x += CurrentPlayer.vx;
        CurrentPlayer.y += CurrentPlayer.vy;
        // round it / ceiling or flooring wont work (example 243.003 242.8999)
        CurrentPlayer.x = Number((CurrentPlayer.x).toFixed(0));
        CurrentPlayer.y = Number((CurrentPlayer.y).toFixed(0));

        // check for collision Player VS Player
        for (var j = 0; j < Sprites.Players.length; j++) {
            if (j == i) {
                continue;
            }
            var opponent = Sprites.Players[j];
            var collisionSide = collisionDetection(CurrentPlayer, opponent, true);
            if (collisionSide == "bottom") {
                CurrentPlayer.isOnGround = true;
                CurrentPlayer.vy = -GP.GameGravity;
                // stun in seconds
                opponent.stunTime = GP.GameStunTime;
                opponent.stunDuration = opponent.stunTime;
                opponent.stunStart = new Date();
            }
        }
        // check for collision with collisionObjects
        var colObjects = Sprites.Map.sprites.realCollisionObjects;
        for (var j = 0; j < colObjects.length; j++) {
            var cObject = colObjects[j];
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
            if (collisionSide !== "bottom" && CurrentPlayer.vy > 0) {
                CurrentPlayer.isOnGround = false;
            }
        }
        // check for collision with killObjects
        for (var j = 0; j < Sprites.Map.sprites.killObjects.length; j++) {
            var object = Sprites.Map.sprites.killObjects[j];
            var collisionSide = collisionDetection(CurrentPlayer, object, false);
            if (collisionSide != "none") {
                CurrentPlayer.x = 0;
                CurrentPlayer.y = 0;
            }
        }
        // check for collision with startObjects

        var startObj = Sprites.Map.sprites.startObjects;

        if (startObj != null) {
            for (var j = 0; j < Sprites.Map.sprites.startObjects.length; j++) {
                var object = Sprites.Map.sprites.startObjects[j];
                var collisionSide = collisionDetectionWithoutCollision(CurrentPlayer, object, false);
                if (collisionSide != "none") {
                    //Start Timer
                    if (CurrentPlayer.Timer == false) {
                        CurrentPlayer.Time = new Date();
                        startTime = CurrentPlayer.Time;
                        CurrentPlayer.Timer = true;
                        counter = setInterval(timer, 10);
                    }
                }
            }
        }

        //check collision with goalObjects

        var goalObj = Sprites.Map.sprites.goalObjects;

        if (goalObj != null) {
            for (var j = 0; j < Sprites.Map.sprites.goalObjects.length; j++) {
                var object = Sprites.Map.sprites.goalObjects[j];
                var collisionSide = collisionDetectionWithoutCollision(CurrentPlayer, object, false);
                if (collisionSide != "none") {
                    //TODO Stop Timer
                    clearInterval(counter);
                }
            }
        }
        // Limit for World with bounce effect
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
        if ((CurrentPlayer.x + CurrentPlayer.width) > Sprites.Map.width) {
            CurrentPlayer.vx *= GP.GameBounce;
            CurrentPlayer.x = Sprites.Map.width - CurrentPlayer.width;
        }
        //Bottom
        if ((CurrentPlayer.y + CurrentPlayer.height) > Sprites.Map.height) {
            CurrentPlayer.y = Sprites.Map.height - CurrentPlayer.height;
            CurrentPlayer.isOnGround = true;
            CurrentPlayer.vy = 0;
        }
    }
};

/**
 *Starts Timer, calculates Differenz between the
 *Time the Timer has started and now.
 *Formates the Time into Minutes:Seconds:Milliseconds
 */
function timer() {
    var time = formatTime(Date.now() - startTime);
    document.getElementById("timer").innerHTML = time;
}

function formatTime(elapsed) {
    var hours, minutes, seconds, milis;

    minutes = Math.floor(elapsed / (60 * 1000));
    elapsed -= minutes * 60 * 1000;

    seconds = Math.floor(elapsed / 1000);
    elapsed -= seconds * 1000;

    milis = Math.floor(elapsed / 100);

    return minutes + ':' + seconds + ':' + milis;
}

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

//collision with startObjects "without any collision"
function collisionDetectionWithoutCollision(o1, o2, bounce) {
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
                } else {
                    collisionSide = "bottom";
                }
            } else {
                // collision on Y-Axis
                if (vectorX > 0) {
                    collisionSide = "left";
                } else {
                    collisionSide = "right";
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