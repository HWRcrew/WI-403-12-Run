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
var Connection;
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
// TODO remove testmap and read json
var map1layerCol = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3, 4],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 0, 0, 0, 2, 3, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
];
// build map
// buildMap(map);
buildLayer(map1layerCol, "collision");
// ACTION
// first request from a client
Server.on("request", function(request) {
    Connection = request.accept(null, request.origin);
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
                    // Send initial GameState with Map-Data
                    SendInitialGameState();
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
            Connections[ID].Player.vy += Game.GP.GameJumpForce;
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
function SendInitialGameState() {
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
    var json = JSON.stringify({
        Type: "all",
        MyID: Indices[Connection.ID],
        Sprites: Sprites
    });
    console.log(new Date() + " GameState-length " + json.length + " in Bytes " + Buffer.byteLength(json, 'utf8'));
    Connection.sendUTF(json);
};

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
        var json = JSON.stringify({
            Type: "players",
            MyID: Indices[ID],
            Players: Sprites.Players
        });
        console.log(new Date() + " GameState-length " + json.length + " in Bytes " + Buffer.byteLength(json, 'utf8'));
        Connections[ID].sendUTF(json);
    }
}
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
 * builds single layers
 */
// STATE BROKEN
// TODO fix problem with Server
function buildLayer(layerInput, layer) {
    var ROWS = layerInput.length;
    var SIZE = 32;
    var tilesheetColumns = 9;
    var COLLISIONLAYER = "collision";
    var GOALLAYER = "goal";
    var KILLLAYER = "kill";
    var OTHERLAYER = "other";
    var collision = false;
    switch (layer) {
        case COLLISIONLAYER:
            Sprites.collisionObjects = new Array();
            layer = Sprites.collisionObjects;
            Sprites.realCollisionObjects = new Array();
            collision = true;
            break;
        case GOALLAYER:
            Sprites.goalObjects = [];
            layer = Sprites.goalObjects;
            collision = false;
            break;
        case KILLLAYER:
            Sprites.killObjects = [];
            layer = Sprites.killObjects;
            collision = false;
            break;
        case OTHERLAYER:
            Sprites.otherObjects = [];
            layer = Sprites.otherObjects;
            collision = false;
            break;
        default:
            console.log("Layer unknown!");
            break;
    }
    var COLUMNS = layerInput[0].length;
    for (var row = 0; row < ROWS; row++) {
        var rectLength = 0;
        for (var column = 0; column < COLUMNS; column++) {
            var currentTile = layerInput[row][column];
            // for the realCollisionObjects and to summarize them to bigger objects
            if (collision) {
                if (currentTile !== 0) {
                    rectLength++;
                }
                // case 1 [0,0,3,3,3,0]
                if (currentTile === 0 && rectLength > 0) {
                    // create object with size etc.
                    var object = Object.create(Game.spriteObject);
                    object.y = row * SIZE;
                    object.x = (column - rectLength) * SIZE;
                    object.width = rectLength * SIZE;
                    flatten(object);
                    Sprites.realCollisionObjects.push(object);
                    rectLength = 0;
                }
                // case 2 [0,0,3,3,3]
                if (column === COLUMNS - 1 && currentTile !== 0) {
                    var object = Object.create(Game.spriteObject);
                    object.y = row * SIZE;
                    object.x = (column - (rectLength - 1)) * SIZE;
                    object.width = rectLength * SIZE;
                    flatten(object);
                    Sprites.realCollisionObjects.push(object);
                    rectLength = 0;
                }
            }
            var tileSheetX = Math.floor((currentTile - 1) % tilesheetColumns) * SIZE;
            var tileSheetY = Math.floor((currentTile - 1) / tilesheetColumns) * SIZE;
            if (currentTile !== 0) {
                var object = Object.create(Game.spriteObject);
                object.sourceX = tileSheetX;
                object.sourceY = tileSheetY;
                object.x = column * SIZE;
                object.y = row * SIZE;
                flatten(object);
                layer.push(object);
            }
        }
    }
};

/**
 * converts one-dimensional array into two-dimensional array
 */
// STATE: OK
function convertArray(array, columns) {
    if (array.length % columns !== 0) {
        console.log("Array has not the right size(" + array.length + ") for that number of columns(" + columns + ")!");
    } else {
        // create resulting array
        var result = new Array(array.length / columns);
        for (var i = 0; i < result.length; i++) {
            result[i] = new Array(columns);
        }
        var row = 0;
        var column = 0;
        // loop over given array to fill result
        for (var i = 0; i < array.length; i++) {
            result[row][column] = array[i];
            column++;
            if (((i + 1) % columns) === 0) {
                row++;
                column = 0;
            }
        }
        return result;
    }
};