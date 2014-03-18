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
                    Connection.Player.x = Math.floor(Math.random() * (Game.GP.GameWidth - 32));
                    Connection.Player.y = Math.floor(Math.random() * (Game.GP.GameHeight - 47));
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
    var Players = [];
    for (var ID in Connections) {
        if (!Connections[ID].Player) {
            continue;
        }
        Players.push(Connections[ID].Player);
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
    Game.RunGameFrame(Players);
    // send gamestate
    SendGameState();
}, Game.GP.GameFrameTime);

/*
 * helper functions
 */
// send GameState to Clients
function SendGameState() {
    var PlayersData = [];
    // helping hash map with connection IDs and PlayersData IDs;
    var Indices = {};
    // store the Player of every Connection in Players
    for (var ID in Connections) {
        if (!Connections[ID].Player) {
            continue;
        }
        PlayersData.push(Connections[ID].Player);
        // store matching IDs
        Indices[ID] = PlayersData.length - 1;
    }
    // broadcast Players to all Clients
    for (var ID in Connections) {
        Connections[ID].sendUTF(JSON.stringify({
            MyID: Indices[ID],
            Players: PlayersData
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