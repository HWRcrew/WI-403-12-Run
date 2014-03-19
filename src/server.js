// colors in console.log
var colors = require('colors');
var HTTP = require("http");
var WebSocketServer = require("websocket").server;
// imports game.js
var Game = require("./game.js");
// Port
var port = 1337;
// Object to store Connections
var Connections = {};
// Stores Players[], collsionObjects[], killObject[], goalObjects[] and Other[]
var Sprites = {};
var MostConcurrentConnections = 0;
// simple HTTP Server
var HTTPServer = HTTP.createServer(function(request, response) {});

// make server listen on port
HTTPServer.listen(port, function() {
    console.log("Server is listening on port " + port);
});

// create WebSocketServer from HTTPServer
var Server = new WebSocketServer({
    httpServer: HTTPServer,
    closeTimeout: 6000
});
var map = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2, 4, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 6, 0, 0, 0],
    [3, 3, 3, 3, 3, 3, 4, 8, 8, 8, 8, 8, 8, 8, 2, 3, 3, 3, 3, 3, 3, 0, 0, 0]
];
// build map
buildMap(map);
// ACTION
// first request from a client
Server.on("request", function(request) {
    var Connection = request.accept(null, request.origin);
    Connection.IP = request.remoteAddress;
    // assign random ID to Connection
    do {
        Connection.ID = Math.floor(Math.random() * 100000);
    } while (Connection.ID in Connections);
    // add Connection to Connections
    Connections[Connection.ID] = Connection;
    // check the most sametime connections for logging
    if (MostConcurrentConnections < ConnectionsSize()) {
        MostConcurrentConnections = ConnectionsSize();
    }
    // log new Connection
    console.info((new Date()) + " IP " + (Connection.IP).green + " - connected \tID: " + (Connection.ID).toString().yellow + " - Connections: " + ConnectionsSize() + " | most: " + MostConcurrentConnections);
    // on message
    Connection.on("message", function(message) {
        if (message.type == "utf8") {
            // get message data and parse to JSON
            try {
                message = JSON.parse(message.utf8Data);
            } catch (error) {
                console.error((new Date()) + " JSON parsing error: ", error);
            }
            /* differentiate between message-types
             * TYPES:
             * handshake
             * keydown
             * keyup
             *
             * lobbyjoin
             * lobbycreate
             * lobbychange
             */
            switch (message.Type) {
                case "handshake":
                    console.info((new Date()) + " IP " + (Connection.IP).green + " - handshake with: " + (message.Data).toString().blue);
                    // abort if Connection already spawned a player
                    if (Connection.Player) {
                        break;
                    }
                    // create Player at random position in Canvas
                    Connection.Player = Object.create(Game.spriteObject);
                    Connection.Player.height = 47;
                    Connection.Player.sourceHeight = 47;
                    Connection.Player.x = Math.floor(Math.random() * (Game.GP.GameWidth - Connection.Player.width));
                    Connection.Player.y = Math.floor(Math.random() * (Game.GP.GameHeight - Connection.Player.height));
                    Connection.Player.Name = message.Data.toString().substring(0, 16);
                    // flatten Object
                    Connection.Player = flatten(Connection.Player);
                    // initial KeysPressed on serverside
                    Connection.KeysPressed = 0;
                    break;
                case "keydown":
                    if (message.Data == 38) {
                        // UP
                        Connection.KeysPressed |= 1;
                    } else if (message.Data == 37) {
                        // LEFT
                        Connection.KeysPressed |= 2;
                        Connection.KeysPressed &= ~4;
                    } else if (message.Data == 39) {
                        // RIGHT
                        Connection.KeysPressed |= 4;
                        Connection.KeysPressed &= ~2;
                    } else if (message.Data == 40) {
                        // DOWN
                        Connection.KeysPressed |= 8;
                    }
                    break;
                case "keyup":
                    if (message.Data == 38) {
                        // UP
                        Connection.KeysPressed &= ~1;
                    } else if (message.Data == 37) {
                        // LEFT
                        Connection.KeysPressed &= ~2;
                    } else if (message.Data == 39) {
                        // RIGHT
                        Connection.KeysPressed &= ~4;
                    } else if (message.Data == 40) {
                        // DOWN
                        Connection.KeysPressed &= ~8;
                    }
                    break;
                default:
                    break;
            }
        };
    });
    // on close
    Connection.on("close", function() {
        // remove Connection from Connections
        if (Connection.ID in Connections) {
            console.info((new Date()) + " IP " + Connection.IP.green + " - disconnected \tID: " + (Connection.ID).toString().yellow);
            delete Connections[Connection.ID];
        }
    });
});
// game loop on server-side
// TODO gameloop
setInterval(function() {
    // gameloop actions

    // for collision purposes we make a copy of the Players as Array to be handled in game.js
    Sprites.Players = [];
    for (var ID in Connections) {
        if (!Connections[ID].Player) {
            continue;
        }
        Sprites.Players.push(Connections[ID].Player);
        // UP
        if (Connections[ID].KeysPressed & 1 && Connections[ID].Player.isOnGround) {
            Connections[ID].Player.vy += Connections[ID].Player.jumpForce;
            Connections[ID].Player.isOnGround = false;
            Connections[ID].Player.friction = 1;
        }
        // LEFT
        if (Connections[ID].KeysPressed & 2) {
            Connections[ID].Player.accelerationX = -0.4;
            Connections[ID].Player.friction = 1;
        }
        // RIGHT
        if (Connections[ID].KeysPressed & 4) {
            Connections[ID].Player.accelerationX = +0.4;
            Connections[ID].Player.friction = 1;
        }
        // DOWN
        if (Connections[ID].KeysPressed & 8 && !Connections[ID].Player.isOnGround) {
            Connections[ID].Player.accelerationY = +1;
            Connections[ID].Player.friction = 1;
        }
        // not up or not down 
        if (Connections[ID].KeysPressed == 2 || Connections[ID].KeysPressed == 4 || Connections[ID].KeysPressed == 6) {
            Connections[ID].Player.accelerationY = 0;
        }
        // not right or not left
        if (Connections[ID].KeysPressed == 1 || Connections[ID].KeysPressed == 8 || Connections[ID].KeysPressed == 9) {
            Connections[ID].Player.accelerationX = 0;
        }
        // no key pressed
        if (Connections[ID].KeysPressed == 0) {
            Connections[ID].Player.friction = Game.GP.GameFriction;
            Connections[ID].Player.gravity = 0.6;
            Connections[ID].Player.accelerationY = 0;
            Connections[ID].Player.accelerationX = 0;
        }
    }
    // Run GameFrame
    Game.RunGameFrame(Sprites);
    // send gamestate
    SendGameState();
}, Game.GP.GameFrameTime);

/*
 * helper functions
 */
// send GameState to Clients
function SendGameState() {
    Sprites.Players = [];
    // helping hash map with connection IDs and PlayersData IDs;
    var Indices = {};
    // store the Player of every Connection in Players
    for (var ID in Connections) {
        if (!Connections[ID].Player) {
            continue;
        }
        Sprites.Players.push(Connections[ID].Player);
        // store matching IDs
        Indices[ID] = Sprites.Players.length - 1;
    }
    // broadcast Players to all Clients
    for (var ID in Connections) {
        Connections[ID].sendUTF(JSON.stringify({
            MyID: Indices[ID],
            Sprites: Sprites
        }));
    }
};
// Flatten Object for JSON.stringify
function flatten(object) {
    // var result = Object.create(object);
    for (var key in object) {
        object[key] = object[key];
    }
    return object;
}

// count number of Connections
function ConnectionsSize() {
    var size = 0;
    for (ID in Connections) {
        if (Connections.hasOwnProperty(ID)) {
            size++;
        }
    }
    return size;
};

/**
 * mapbuilder
 */
function buildMap(mapArray) {
    /**
     * MapCode
     */
    var EMPTY = 0;
    var GROUNDROUND = 1;
    var GROUNDLEFTROUND = 2;
    var GROUNDSTRAIGHT = 3;
    var GROUNDRIGHTROUND = 4;
    var EXIT = 5;
    var DOORBOTTOM = 6;
    var DOORTOP = 7;
    var WATER = 8;
    var ARROW = 9;

    Sprites.collisionObjects = [];
    Sprites.goalObjects = [];
    Sprites.killObjects = [];
    Sprites.otherObjects = [];
    var ROWS = mapArray.length;
    var SIZE = 32;
    var tilesheetColumns = 9;
    // TODO remove existing sprites except players or you will overload the sprites with objects
    var COLUMNS = mapArray[0].length;
    for (var row = 0; row < ROWS; row++) {
        for (var column = 0; column < COLUMNS; column++) {
            var currentTile = mapArray[row][column];
            if (currentTile == EMPTY) {
                continue;
            }
            var tileSheetX = Math.floor((currentTile - 1) % tilesheetColumns) * SIZE;
            var tileSheetY = Math.floor((currentTile - 1) / tilesheetColumns) * SIZE;
            switch (currentTile) {
                case GROUNDROUND:
                    var groundround = Object.create(Game.spriteObject);
                    groundround.sourceX = tileSheetX;
                    groundround.sourceY = tileSheetY;
                    groundround.x = column * SIZE;
                    groundround.y = row * SIZE;
                    flatten(groundround);
                    Sprites.collisionObjects.push(groundround);
                    break;
                case GROUNDLEFTROUND:
                    var groundleftround = Object.create(Game.spriteObject);
                    groundleftround.sourceX = tileSheetX;
                    groundleftround.sourceY = tileSheetY;
                    groundleftround.x = column * SIZE;
                    groundleftround.y = row * SIZE;
                    flatten(groundleftround);
                    Sprites.collisionObjects.push(groundleftround);
                    break;
                case GROUNDSTRAIGHT:
                    var groundstraight = Object.create(Game.spriteObject);
                    groundstraight.sourceX = tileSheetX;
                    groundstraight.sourceY = tileSheetY;
                    groundstraight.x = column * SIZE;
                    groundstraight.y = row * SIZE;
                    flatten(groundstraight);
                    Sprites.collisionObjects.push(groundstraight);
                    break;
                case GROUNDRIGHTROUND:
                    var groundrightround = Object.create(Game.spriteObject);
                    groundrightround.sourceX = tileSheetX;
                    groundrightround.sourceY = tileSheetY;
                    groundrightround.x = column * SIZE;
                    groundrightround.y = row * SIZE;
                    flatten(groundrightround);
                    Sprites.collisionObjects.push(groundrightround);
                    break;
                case EXIT:
                    var exit = Object.create(Game.spriteObject);
                    exit.sourceX = tileSheetX;
                    exit.sourceY = tileSheetY;
                    exit.x = column * SIZE;
                    exit.y = row * SIZE;
                    flatten(exit);
                    Sprites.otherObjects.push(exit);
                    break;
                case DOORBOTTOM:
                    var doorbottom = Object.create(Game.spriteObject);
                    doorbottom.sourceX = tileSheetX;
                    doorbottom.sourceY = tileSheetY;
                    doorbottom.x = column * SIZE;
                    doorbottom.y = row * SIZE;
                    flatten(doorbottom);
                    Sprites.goalObjects.push(doorbottom);
                    break;
                case DOORTOP:
                    var doortop = Object.create(Game.spriteObject);
                    doortop.sourceX = tileSheetX;
                    doortop.sourceY = tileSheetY;
                    // handle special doortop height
                    doortop.height = 16;
                    doortop.x = column * SIZE;
                    doortop.y = row * SIZE;
                    flatten(doortop);
                    Sprites.goalObjects.push(doortop);
                    break;
                case WATER:
                    var water = Object.create(Game.spriteObject);
                    water.sourceX = tileSheetX;
                    water.sourceY = tileSheetY;
                    water.x = column * SIZE;
                    water.y = row * SIZE;
                    flatten(water);
                    Sprites.killObjects.push(water);
                    break;
                case ARROW:
                    var arrow = Object.create(Game.spriteObject);
                    arrow.sourceX = tileSheetX;
                    arrow.sourceY = tileSheetY;
                    arrow.x = column * SIZE;
                    arrow.y = row * SIZE;
                    flatten(arrow);
                    Sprites.otherObjects.push(arrow);
                    break;
                default:
                    console.log("Unknown tile");
                    break;
            }
        }
    }
};