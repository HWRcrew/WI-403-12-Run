// Context for manipulation of the canvas-element
var GraphicsContext;
var WebSocketUrl = "ws://localhost:1337";
var Connection = null;
// stores ID of interval (gameloop) to stop it later on
var GameLoop = null;
var Players = [];
var MyPlayer = null;

var SpriteImage = new Image();
SpriteImage.src = "sprite.png";

/**
 * ToDos
 */
// TODO Collision
// TODO Lobbies
// TODO Time Tracking
// TODO Animationmovement drawImage sy sx sw sh
// TODO Maps
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
var KeysPressed = 0;
// Input-Handling
document.addEventListener("keydown", function(key) {
    // bool to check if we transmit the input
    var Transmit = false;
    console.log("keydown" + key.which);
    // check if the key is * and is not already pressed
    if (key.which == 38 && (KeysPressed & 1) == 0) {
        // UP
        Transmit = true;
        // same as KeysPressed = KeysPressed | 1 (adds up 0001 to the current value)
        KeysPressed |= 1;
    } else if (key.which == 37 && (KeysPressed & 2) == 0) {
        // LEFT
        Transmit = true;
        KeysPressed |= 2
    } else if (key.which == 39 && (KeysPressed & 4) == 0) {
        // RIGHT
        Transmit = true;
        KeysPressed |= 4;
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
// window load
window.addEventListener("load", function() {
    var GameCanvas = document.getElementById("gamecanvas");
    GameCanvas.width = GlobalProperties.GameWidth;
    GameCanvas.height = GlobalProperties.GameHeight;
    GraphicsContext = GameCanvas.getContext("2d");
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
        // TODO what to do on open connection??
        // prompt for name and send to server (max length 16 chars)
        if (Connection && Connection.readyState == 1) {
            var name = window.prompt("Tell me your name...");
            Connection.send(JSON.stringify({
                Type: "handshake",
                Data: name.substring(0, 16)
            }))
        }
        // Updating the game in an interval - game loop
        GameLoop = setInterval(function() {
            /* 
             * handle keyinput and move player
             * again with bitwise operators
             */
            // UP
            if (KeysPressed & 1) {
                MyPlayer.PosY -= 8;
            }
            // LEFT
            if (KeysPressed & 2) {
                MyPlayer.PosX -= 8;
            }
            // RIGHT
            if (KeysPressed & 4) {
                MyPlayer.PosX += 8;
            }
            // DOWN
            if (KeysPressed & 8) {
                MyPlayer.PosY += 8;
            }
            DrawGame();
        }, GlobalProperties.GameFrameTime);
    };
    // message from server
    Connection.onmessage = function(message) {
        try {
            message = JSON.parse(message.data);
        } catch (error) {
            console.error((new Date()) + " JSON parsing error: ", error);
        }
        Players = message.Players;
        // get own player
        if (message.MyID in Players) {
            MyPlayer = Players[message.MyID];
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
        alert("WebSocket connection closed!");
    };
});

// Function for drawing of the current Game-State
function DrawGame() {
    // Clear the screen
    GraphicsContext.clearRect(0, 0, GlobalProperties.GameWidth, GlobalProperties.GameHeight);
    // Set font
    GraphicsContext.font = "8pt Arial";
    // draw every player
    for (var i = 0; i < Players.length; i++) {
        GraphicsContext.drawImage(SpriteImage, Players[i].PosX, Players[i].PosY);
        // draw Name above every Player
        if (Players[i].Name) {
            // Decide wether it is me or someone else
            if (Players[i] == MyPlayer) {
                GraphicsContext.fillText("Le Me", Players[i].PosX, Players[i].PosY);
            } else {
                GraphicsContext.fillText(Players[i].Name, Players[i].PosX, Players[i].PosY);
            }
        }
    }
};