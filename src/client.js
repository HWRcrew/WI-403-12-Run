// Context for manipulation of the canvas-element
var GraphicsContext;
var WebSocketUrl = "ws://localhost:1337";
var Connection = null;
// stores ID of interval (gameloop) to stop it later on
var GameLoop = null;
var MyPlayer = null;
var KeysPressed = 0;
var SpriteImage = new Image();
SpriteImage.src = "images/sprites_1.png";
var TileImage = new Image();
TileImage.src = "images/tiles.png";
var backgroundImage = new Image();
backgroundImage.src = "images/background.png";

var jumpButton;

/**
 * ToDos
 */
// TODO Lobbies
// TODO Time Tracking
// TODO Animationmovement drawImage sy sx sw sh
// TODO isOnGround is not set to false when falling from platform (jump while falling is possible)
// TODO Game-Ending / Flag finish? How to check
// TODO DB - Input with Highscores
/*
 * Notes:
 * The bitwise OR operation ( | 0) does the same thing as Math.floor, but is faster. -> implement
 */


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
document.addEventListener("keydown", function(key) {
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
document.addEventListener("keyup", function(key) {
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
document.addEventListener("touchstart", function(event) {
    var Transmit = false;
    if (event.target == jumpButton) {
        Transmit = true;
        KeysPressed |= 1;
    }
    if (Transmit && Connection && Connection.readyState == 1) {
        Connection.send(JSON.stringify({
            Type: "keydown",
            Data: "38"
        }));
    }
});
document.addEventListener("touchend", function(event) {
    var Transmit = false;
    if (event.target == jumpButton) {
        Transmit = true;
        KeysPressed &= ~1;
    }
    if (Transmit && Connection && Connection.readyState == 1) {
        Connection.send(JSON.stringify({
            Type: "keyup",
            Data: "38"
        }));
    }
});
// end mobile

// window load
window.addEventListener("load", function() {
    var GameCanvas = document.querySelector("canvas");
    GameCanvas.width = GP.GameWidth;
    GameCanvas.height = GP.GameHeight;
    GraphicsContext = GameCanvas.getContext("2d");

    // add jumpButton for eventListener
    jumpButton = document.querySelector("#jumpButton")

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
    Connection.onopen = function() {
        // prompt for name and send to server (max length 16 chars)
        if (Connection && Connection.readyState == 1) {
            var name = window.prompt("Tell me your name...");
            Connection.send(JSON.stringify({
                Type: "handshake",
                Data: name.substring(0, 16)
            }))
        }
        // Updating the gamestate in an interval - game loop
        GameLoop = setInterval(function() {
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
            DrawGame();

        }, GP.GameFrameTime);
    };
    // message from server
    Connection.onmessage = function(message) {
        try {
            message = JSON.parse(message.data);
        } catch (error) {
            console.error((new Date()) + " JSON parsing error: ", error);
        }
        if (message.Type == "all") {
            Sprites = message.Sprites;
        }
        if (message.Type == "players") {
            Sprites.Players = message.Players;
        }
        // need to make new Date out of stunStart, because of JSON.stringify / JSON.parse
        for (var i = 0; i < Sprites.Players.length; i++) {
            if (Sprites.Players[i].stunStart) {
                Sprites.Players[i].stunStart = new Date(Sprites.Players[i].stunStart);
            }
        }
        // get own player
        if (message.MyID in Sprites.Players) {
            MyPlayer = Sprites.Players[message.MyID];
        }
    };
    // error of connection
    Connection.onerror = function(error) {
        alert("WebSocket error occured: \n\n" + JSON.stringify(error));
    };
    // close of connection
    Connection.onclose = function() {
        // clear GameLoop to stop execution
        if (GameLoop) {
            clearInterval(GameLoop);
        }
        GameLoop = null;
        document.body.innerHTML = "Connection closed!";
    };
});

/*void drawImage(
  in nsIDOMElement image,
  in float sx,
  in float sy,
  in float sw,
  in float sh,
  in float dx, 
  in float dy,
  in float dw,
  in float dh
);*/

// Function for drawing of the current Game-State
var counterRight = 1;
var counterLeft = 14;
function DrawGame() {
    // Clear the screen
    GraphicsContext.clearRect(0, 0, GP.GameWidth, GP.GameHeight);
    // Set font for Playername
    GraphicsContext.font = "8pt Arial";
    GraphicsContext.drawImage(backgroundImage, 0, 0);
    // translate the canvas - so you move it around the map
    // GraphicsContext.translate(MyPlayer.offsetX, MyPlayer.offsetY);
    // draw collisionObjects[]
    if (Sprites.collisionObjects) {
        for (var i = 0; i < Sprites.collisionObjects.length; i++) {
            sprite = Sprites.collisionObjects[i];
            GraphicsContext.drawImage(TileImage, sprite.sourceX, sprite.sourceY, sprite.sourceWidth, sprite.sourceHeight, sprite.x, sprite.y, sprite.sourceWidth, sprite.sourceHeight);
        }
    }
    // draw killObjects[]
    if (Sprites.killObjects) {
        for (var i = 0; i < Sprites.killObjects.length; i++) {
            sprite = Sprites.killObjects[i];
            GraphicsContext.drawImage(TileImage, sprite.sourceX, sprite.sourceY, sprite.sourceWidth, sprite.sourceHeight, sprite.x, sprite.y, sprite.sourceWidth, sprite.sourceHeight);

        }
    }
    // draw goalObjects[]
    if (Sprites.goalObjects) {
        for (var i = 0; i < Sprites.goalObjects.length; i++) {
            sprite = Sprites.goalObjects[i];
            GraphicsContext.drawImage(TileImage, sprite.sourceX, sprite.sourceY, sprite.sourceWidth, sprite.sourceHeight, sprite.x, sprite.y, sprite.sourceWidth, sprite.sourceHeight);
        }
    }
    // draw otherObjects[]
    if (Sprites.otherObjects) {
        for (var i = 0; i < Sprites.otherObjects.length; i++) {
            sprite = Sprites.otherObjects[i];
            GraphicsContext.drawImage(TileImage, sprite.sourceX, sprite.sourceY, sprite.sourceWidth, sprite.sourceHeight, sprite.x, sprite.y, sprite.sourceWidth, sprite.sourceHeight);
        }
    }
    // draw Players[]

    /*
    Animated Player Images

    */
    
        var SIZE = 32;


        if(counterRight >11){
            counterRight = 1;
        }
        if(counterLeft >24){
            counterLeft = 14;
        }

        for (var i = 0; i < Sprites.Players.length; i++) {
            sprite = Sprites.Players[i];
            sprite.sourceY = 0;
            sprite.sourceHeight = 45;


            if(sprite.stunDuration > 0){
                sprite.sourceX = 13*SIZE;
            }
            else if(sprite.isOnGround == false){
                if(sprite.accelerationX > 0){
                    sprite.sourceX = 12*SIZE;
                }
                else if(sprite.accelerationX < 0){
                    sprite.sourceX = 25*SIZE;
                }
                else{
                    sprite.sourceX = 12*SIZE;
                }
                
            }
            else if(sprite.accelerationX > 0){
                sprite.sourceX = counterRight*SIZE;
                counterRight++;
            }
            else if(sprite.accelerationX < 0){
                sprite.sourceX = counterLeft*SIZE;
                counterLeft++;
            }
            else{
                sprite.sourceX = 0;
            }
        
        //alert(sprite.sourceHeight);
        GraphicsContext.drawImage(SpriteImage, sprite.sourceX, sprite.sourceY, sprite.sourceWidth, sprite.sourceHeight, sprite.x, sprite.y, sprite.sourceWidth, sprite.sourceHeight);
        

             // draw Name above every Player
            if (Sprites.Players[i].Name) {
                // Decide wether it is me or someone else
                if (Sprites.Players[i] == MyPlayer) {
                    GraphicsContext.fillText("Le Me " + Sprites.Players[i].stunDuration, Sprites.Players[i].x, Sprites.Players[i].y);
                } else {
                    GraphicsContext.fillText(Sprites.Players[i].Name, Sprites.Players[i].x, Sprites.Players[i].y);
                }
            }
        }
    /*

    for (var i = 0; i < Sprites.Players.length; i++) {
       
        GraphicsContext.drawImage(SpriteImage, Sprites.Players[i].x, Sprites.Players[i].y);

    
        // draw Name above every Player
        if (Sprites.Players[i].Name) {
            // Decide wether it is me or someone else
            if (Sprites.Players[i] == MyPlayer) {
                GraphicsContext.fillText("Le Me " + Sprites.Players[i].stunDuration, Sprites.Players[i].x, Sprites.Players[i].y);
            } else {
                GraphicsContext.fillText(Sprites.Players[i].Name, Sprites.Players[i].x, Sprites.Players[i].y);
            }
        }
    }

    */
};