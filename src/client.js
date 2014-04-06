// Context for manipulation of the canvas-element
var GraphicsContext;
var WebSocketUrl = "ws://localhost:1337";
var Connection = null;
// stores ID of interval (gameloop) to stop it later on
var GameLoop = null;
var MyPlayer = null;
var KeysPressed = 0;
var SpriteImage = new Image();
SpriteImage.src = "images/sprites.png";
var TileImage = new Image();
TileImage.src = "images/tiles.png";
//loading, playing
var clientState = "loading";

var jumpButton;
var leftButton;
var rightButton;

var camera;
var GameCanvas;

draw = function (sprite, context, sourceImage, camera) {
    context.save();
    // if sprite out of view do not paint it 
    //    if (sprite.x - camera.xView > (-GP.tileBlockSize) || sprite.y - camera.yView > (-GP.tileBlockSize) || (sprite.x - camera.xView) < (camera.viewportRect.width /*+ GP.tileBlockSize*/ ) || (sprite.y - camera.yView) < (camera.viewportRect.height /*+ GP.tileBlockSize*/ )) {
    context.drawImage(sourceImage, sprite.sourceX, sprite.sourceY, sprite.sourceWidth, sprite.sourceHeight, sprite.x - camera.xView, sprite.y - camera.yView, sprite.sourceWidth, sprite.sourceHeight);
    //    }
    context.restore();
};
//Rectangle constructor
var Game = {};
(function () {
    function Rectangle(left, top, width, height) {
        this.left = left || 0;
        this.top = top || 0;
        this.width = width || 0;
        this.height = height || 0;
        this.right = this.left + this.width;
        this.bottom = this.top + this.height;
    }

    Rectangle.prototype.set = function (left, top, /*optional*/ width, /*optional*/ height) {
        this.left = left;
        this.top = top;
        this.width = width || this.width;
        this.height = height || this.height
        this.right = (this.left + this.width);
        this.bottom = (this.top + this.height);
    }

    Rectangle.prototype.within = function (r) {
        return (r.left <= this.left &&
            r.right >= this.right &&
            r.top <= this.top &&
            r.bottom >= this.bottom);
    }

    Rectangle.prototype.overlaps = function (r) {
        return (this.left < r.right &&
            r.left < this.right &&
            this.top < r.bottom &&
            r.top < this.bottom);
    }

    // add "class" Rectangle to our Game object
    Game.Rectangle = Rectangle;
})();
(function () {
    /**
     * possible AXIS to move the camera
     */
    var AXIS = {
        NONE: "none",
        HORIZONTAL: "horizontal",
        VERTICAL: "vertical",
        BOTH: "both"
    };
    /**
     * Camera-Constructor
     */
    function Camera(xView, yView, canvasWidth, canvasHeight, worldWidth, worldHeight) {
        // position of camera (left-top coordinate)
        this.xView = xView || 0;
        this.yView = yView || 0;

        // distance from followed object to border before camera starts move
        this.xDeadZone = 0; // min distance to horizontal borders
        this.yDeadZone = 0; // min distance to vertical borders

        // viewport dimensions
        this.wView = canvasWidth;
        this.hView = canvasHeight;

        // allow camera to move in vertical and horizontal axis
        this.axis = AXIS.BOTH;

        // object that should be followed
        this.followed = null;

        // rectangle that represents the viewport
        this.viewportRect = new Game.Rectangle(this.xView, this.yView, this.wView, this.hView);

        // rectangle that represents the world's boundary (room's boundary)
        this.worldRect = new Game.Rectangle(0, 0, worldWidth, worldHeight);
    };
    // gameObject needs to have "x" and "y" properties (as world(or room) position)
    Camera.prototype.follow = function (gameObject, xDeadZone, yDeadZone) {
        this.followed = gameObject;
        this.xDeadZone = xDeadZone;
        this.yDeadZone = yDeadZone;
    };

    Camera.prototype.update = function () {
        // keep following the player (or other desired object)
        if (this.followed != null) {
            if (this.axis == AXIS.HORIZONTAL || this.axis == AXIS.BOTH) {
                // moves camera on horizontal axis based on followed object position
                if (this.followed.x - this.xView + this.xDeadZone > this.wView)
                    this.xView = this.followed.x - (this.wView - this.xDeadZone);
                else if (this.followed.x - this.xDeadZone < this.xView)
                    this.xView = this.followed.x - this.xDeadZone;

            }
            if (this.axis == AXIS.VERTICAL || this.axis == AXIS.BOTH) {
                // moves camera on vertical axis based on followed object position
                if (this.followed.y - this.yView + this.yDeadZone > this.hView)
                    this.yView = this.followed.y - (this.hView - this.yDeadZone);
                else if (this.followed.y - this.yDeadZone < this.yView)
                    this.yView = this.followed.y - this.yDeadZone;
            }

        }

        // update viewportRect
        this.viewportRect.set(this.xView, this.yView);

        // don't let camera leaves the world's boundary
        if (!this.viewportRect.within(this.worldRect)) {
            if (this.viewportRect.left < this.worldRect.left)
                this.xView = this.worldRect.left;
            if (this.viewportRect.top < this.worldRect.top)
                this.yView = this.worldRect.top;
            if (this.viewportRect.right > this.worldRect.right)
                this.xView = this.worldRect.right - this.wView;
            if (this.viewportRect.bottom > this.worldRect.bottom)
                this.yView = this.worldRect.bottom - this.hView;
        }
    };
    // add "class" Camera to our Game object
    Game.Camera = Camera;

})();

/**
 * ToDos
 */
// TODO Lobbies
// TODO Time Tracking
// TODO Game-Ending / Flag finish? How to check
// TODO DB - Input with Highscores


/* 
 * holds the keys that are currently pressed for the client, the server gets only the key and handles his own KeysPressed variable
 * works with bitwise operators
 * up = 1 -> 0001
 * left = 2 -> 0010
 * right = 4 -> 0100
 * down could be 8
 * all pressed 0111
 * up and left 0011
 * right and left 0110
 * none 0000
 */

// Input-Handling
document.addEventListener("keydown", function (key) {
    // bool to check if we transmit the input
    var Transmit = false;
    // check if the key is * and is not already pressed
    if (key.which == 38 && (KeysPressed & 1) == 0) {
        // UP
        Transmit = true;
        // same as KeysPressed = KeysPressed | 1 (adds up 0001 to the current value)
        KeysPressed |= 1;
    } else if (key.which == 37 && (KeysPressed & 2) == 0 && (KeysPressed & 4) == 0) {
        // LEFT
        Transmit = true;
        KeysPressed |= 2;
        KeysPressed &= ~4;
    } else if (key.which == 39 && (KeysPressed & 4) == 0 && (KeysPressed & 2) == 0) {
        // RIGHT
        Transmit = true;
        KeysPressed |= 4;
        KeysPressed &= ~2;
    } else if (key.which == 40 && (KeysPressed & 8) == 0) {
        // DOWN
        Transmit = true;
        KeysPressed |= 8;
    }
    // Send if Transmit is true, (WebSocket-)Connection exists and readyState is OPEN
    if (Transmit && Connection && Connection.readyState == 1) {
        Connection.send(JSON.stringify({
            Type: "keydown",
            Data: key.which
        }));
    }
});
document.addEventListener("keyup", function (key) {
    // bool to check if we transmit the input
    var Transmit = false;
    if (key.which == 38) {
        // UP
        Transmit = true;
        // same as KeysPressed = KeysPressed & ~1 (removes 0001 from the current value)
        KeysPressed &= ~1;
    } else if (key.which == 37) {
        // LEFT
        Transmit = true;
        KeysPressed &= ~2
    } else if (key.which == 39) {
        // RIGHT
        Transmit = true;
        KeysPressed &= ~4;
    } else if (key.which == 40) {
        // DOWN
        Transmit = true;
        KeysPressed &= ~8;
    }
    if (Transmit && Connection && Connection.readyState == 1) {
        Connection.send(JSON.stringify({
            Type: "keyup",
            Data: key.which
        }));
    }
});

// begin mobile
document.addEventListener("touchstart", function (event) {
    event.preventDefault();
    var Transmit = false;
    var key;
    if (event.target == jumpButton) {
        Transmit = true;
        KeysPressed |= 1;
        key = 38;
    }
    if (event.target == leftButton) {
        Transmit = true;
        KeysPressed |= 2;
        key = 37;
    }
    if (event.target == rightButton) {
        Transmit = true;
        KeysPressed |= 4;
        key = 39;
    }
    if (Transmit && Connection && Connection.readyState == 1) {
        Connection.send(JSON.stringify({
            Type: "keydown",
            Data: key
        }));
    }
});
document.addEventListener("touchend", function (event) {
    event.preventDefault();
    var Transmit = false;
    var key;
    if (event.target == jumpButton) {
        Transmit = true;
        KeysPressed &= ~1;
        key = 38
    }
    if (event.target == leftButton) {
        Transmit = true;
        KeysPressed &= ~2;
        key = 37
    }
    if (event.target == rightButton) {
        Transmit = true;
        KeysPressed &= ~4;
        key = 39
    }
    if (Transmit && Connection && Connection.readyState == 1) {
        Connection.send(JSON.stringify({
            Type: "keyup",
            Data: key
        }));
    }
});
// end mobile

// window load
window.addEventListener("load", function () {
    // add jumpButton for eventListener
    jumpButton = document.querySelector("#jumpButton");
    leftButton = document.querySelector("#leftButton");
    rightButton = document.querySelector("#rightButton");

    // use MozWebSocket if provided by firefox
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    // inform client about missing WebSocket support
    if (!window.WebSocket) {
        alert("Your browser does not support the WebSocket protocol.");
    }
    // establish connection via websocket
    Connection = new WebSocket(WebSocketUrl);

    // event handler for WebSocket
    // open of connection
    Connection.onopen = function () {
        // prompt for name and send to server (max length 16 chars)
        if (Connection && Connection.readyState == 1) {
            var name;
            do {
                name = window.prompt("Tell me your name...");
            } while (!name)
            Connection.send(JSON.stringify({
                Type: "handshake",
                Data: name.substring(0, 16)
            }))
        }
        // Updating the gamestate in an interval - game loop
        GameLoop = setInterval(function () {
            if (clientState === "loading") {
                //TODO decide where to init Camera
                if (Sprites.Map) {
                    GameCanvas = document.querySelector("canvas");
                    // TODO store size somewhere else
                    // Version for standard
                    GameCanvas.width = 768;
                    GameCanvas.height = 384;

                    // Version for megascreen
                    //					var h = document.documentElement.clientHeight;
                    //					var w = document.documentElement.clientWidth;
                    //					GameCanvas.width = (Math.floor(w / 32) - 4) * 32;
                    //					GameCanvas.height = (Math.floor(h / 32) - 4) * 32;

                    GraphicsContext = GameCanvas.getContext("2d");
                    camera = new Game.Camera(0, 0, GameCanvas.width, GameCanvas.height, Sprites.Map.width, Sprites.Map.height);
                    if (camera && MyPlayer) {
                        camera.follow(MyPlayer, GameCanvas.width / 2, GameCanvas.height / 2);
                        clientState = "playing";
                    }
                }
            }
            if (clientState === "playing") {
                // important
                camera.follow(MyPlayer, GameCanvas.width / 2, GameCanvas.height / 2);
                /* 
                 * handle keyinput and move player
                 * again with bitwise operators
                 */
                // UP
                if (KeysPressed & 1 && MyPlayer.isOnGround) {
                    MyPlayer.vy += GP.GameJumpForce;
                    MyPlayer.isOnGround = false;
                    MyPlayer.friction = 1;
                }
                // LEFT
                if (KeysPressed & 2) {
                    MyPlayer.accelerationX = -0.4;
                    MyPlayer.friction = 1;
                }
                // RIGHT
                if (KeysPressed & 4) {
                    MyPlayer.accelerationX = +0.4;
                    MyPlayer.friction = 1;
                }
                // DOWN
                if (KeysPressed & 8 && !MyPlayer.isOnGround) {
                    MyPlayer.accelerationY = +1;
                    // set off friction
                    MyPlayer.friction = 1;
                }
                // not up or not down 
                if (KeysPressed == 2 || KeysPressed == 4 || KeysPressed == 6) {
                    MyPlayer.accelerationY = 0;
                }
                // not right or not left
                if (KeysPressed == 1 || KeysPressed == 8 || KeysPressed == 9) {
                    MyPlayer.accelerationX = 0;
                }
                // no key pressed
                if (KeysPressed == 0) {
                    MyPlayer.friction = GP.GameFriction;
                    MyPlayer.accelerationY = 0;
                    MyPlayer.accelerationX = 0;
                }
                RunGameFrame(Sprites);
                camera.update();
                DrawGame();
            }
        }, GP.GameFrameTime);
    };
    // message from server
    Connection.onmessage = function (message) {
        try {
            message = JSON.parse(message.data);
        } catch (error) {
            console.error((new Date()) + " JSON parsing error: ", error);
        }
        if (message.Type == "map") {
            Sprites.Map = message.Map;
            console.log("Map received!");
        }
        if (message.Type == "players") {
            Sprites.Players = message.Players;
            // need to make new Date out of stunStart, because of JSON.stringify / JSON.parse
            for (var i = 0; i < Sprites.Players.length; i++) {
                if (Sprites.Players[i].stunStart) {
                    Sprites.Players[i].stunStart = new Date(Sprites.Players[i].stunStart);
                }
                // get own player
                if (message.MyID in Sprites.Players) {
                    MyPlayer = Sprites.Players[message.MyID];
                }
            }
        }
    };
    // error of connection
    Connection.onerror = function (error) {
        alert("WebSocket error occured!");
    };
    // close of connection
    Connection.onclose = function () {
        // clear GameLoop to stop execution
        if (GameLoop) {
            clearInterval(GameLoop);
        }
        GameLoop = null;
        document.body.innerHTML = "Connection closed!";
    };
});

// Function for drawing of the current Game-State
var counterRight = 1;
var counterLeft = 14;

function DrawGame() {
    // Clear the screen
    GraphicsContext.clearRect(0, 0, camera.viewportRect.width, camera.viewportRect.height);
    GraphicsContext.fillStyle = Sprites.Map.backgroundColor;
    //	console.log("test" + Sprites.Map.backgroundColor);
    GraphicsContext.fillRect(0, 0, camera.viewportRect.width, camera.viewportRect.height);
    // draw backObjects[]
    if (Sprites.Map.sprites.backObjects) {
        for (var i = 0; i < Sprites.Map.sprites.backObjects.length; i++) {
            sprite = Sprites.Map.sprites.backObjects[i];
            draw(sprite, GraphicsContext, TileImage, camera);
        }
    }
    // draw collisionObjects[]
    if (Sprites.Map.sprites.collisionObjects) {
        for (var i = 0; i < Sprites.Map.sprites.collisionObjects.length; i++) {
            sprite = Sprites.Map.sprites.collisionObjects[i];
            draw(sprite, GraphicsContext, TileImage, camera);
        }
    }
    // draw killObjects[]
    if (Sprites.Map.sprites.killObjects) {
        for (var i = 0; i < Sprites.Map.sprites.killObjects.length; i++) {
            sprite = Sprites.Map.sprites.killObjects[i];
            draw(sprite, GraphicsContext, TileImage, camera);

        }
    }
    // draw goalObjects[]
    if (Sprites.Map.sprites.goalObjects) {
        for (var i = 0; i < Sprites.Map.sprites.goalObjects.length; i++) {
            sprite = Sprites.Map.sprites.goalObjects[i];
            draw(sprite, GraphicsContext, TileImage, camera);
        }
    }
    // draw startObjects[]
    if (Sprites.Map.sprites.startObjects) {
        for (var i = 0; i < Sprites.Map.sprites.startObjects.length; i++) {
            sprite = Sprites.Map.sprites.startObjects[i];
            draw(sprite, GraphicsContext, TileImage, camera);
        }
    }
    // draw otherObjects[]
    if (Sprites.Map.sprites.otherObjects) {
        for (var i = 0; i < Sprites.Map.sprites.otherObjects.length; i++) {
            sprite = Sprites.Map.sprites.otherObjects[i];
            draw(sprite, GraphicsContext, TileImage, camera);
        }
    }
    // draw Players[]

    /*
     * Animate Player Images
     */
    var SIZE = 32;
    var HEIGHT = 45;


    if (counterRight > 11) {
        counterRight = 1;
    }
    if (counterLeft > 24) {
        counterLeft = 14;
    }

    for (var i = 0; i < Sprites.Players.length; i++) {
        sprite = Sprites.Players[i];
        sprite.sourceHeight = 45;
        sprite.sourceY = sprite.Col * HEIGHT;

        if (sprite.stunDuration > 0) {
            sprite.sourceX = 13 * SIZE;
        } else if (sprite.isOnGround == false) {
            if (sprite.vx > 0) {
                sprite.sourceX = 12 * SIZE;
            } else if (sprite.vx < 0) {
                sprite.sourceX = 25 * SIZE;
            } else {
                sprite.sourceX = 12 * SIZE;
            }

        } else if (sprite.accelerationX > 0) {
            sprite.sourceX = counterRight * SIZE;
            counterRight++;
        } else if (sprite.accelerationX < 0) {
            sprite.sourceX = counterLeft * SIZE;
            counterLeft++;
        } else {
            sprite.sourceX = 0;
        }
        draw(sprite, GraphicsContext, SpriteImage, camera);

        // draw Name above every Player
        // Set font for Playername
        GraphicsContext.font = "8pt Arial";
        GraphicsContext.fillStyle = "#000000";
        if (Sprites.Players[i].Name) {
            // Decide wether it is me or someone else
            if (Sprites.Players[i] == MyPlayer) {
                GraphicsContext.fillText("Le Me ", Sprites.Players[i].x - camera.xView, Sprites.Players[i].y - camera.yView);
            } else {
                GraphicsContext.fillText(Sprites.Players[i].Name, Sprites.Players[i].x - camera.xView, Sprites.Players[i].y - camera.yView);
            }
        }
    }

    // draw frontObjects[]
    if (Sprites.Map.sprites.frontObjects) {
        for (var i = 0; i < Sprites.Map.sprites.frontObjects.length; i++) {
            sprite = Sprites.Map.sprites.frontObjects[i];
            draw(sprite, GraphicsContext, TileImage, camera);
        }
    }
};