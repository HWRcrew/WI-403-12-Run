var logger = require('./logger.js');
var HTTP = require("http");
var fs = require('fs');
var MapPath = "./maps/";
var WebSocketServer = require("websocket").server;
// imports game.js
var Game = require("./game.js");
var helpers = require("./helpers");
var Map = require('./map.js');
console.log(Map);
// Port
var port = 1337;
// Object to store Connections
var Connections = {};
// MaxConnections
var MaxConnections = 25;
// Stores Players[], collsionObjects[], killObject[], goalObjects[] and Other[]
var Sprites = {};
// simple HTTP Server
var HTTPServer = HTTP.createServer(function (request, response) {});

// make server listen on port
HTTPServer.listen(port, function () {
	logger.info("Server is listening on port " + port);
});

// create WebSocketServer from HTTPServer
var Server = new WebSocketServer({
	httpServer: HTTPServer,
	closeTimeout: 6000
});

// build map
var ActualMap = new Map("map2");
ActualMap.buildMap();
console.log("actual asdf" + JSON.stringify(ActualMap));
Sprites.Map = ActualMap;

// ACTION
// first request from a client
Server.on("request", function (request) {
	if (ConnectionsSize() >= MaxConnections) {
		request.reject();
		return;
	}
	var Connection = request.accept(null, request.origin);
	Connection.IP = request.remoteAddress;
	// assign random ID to Connection
	do {
		Connection.ID = Math.floor(Math.random() * 100000);
	} while (Connection.ID in Connections);
	// add Connection to Connections
	Connections[Connection.ID] = Connection;
	//	log connection with user-agent
	logger.info("IP " + Connection.IP + " ID: " + Connection.ID + " | user-agent: " + request.httpRequest.headers['user-agent']);
	// on message
	Connection.on("message", function (message) {
		if (message.type == "utf8") {
			// get message data and parse to JSON
			try {
				message = JSON.parse(message.utf8Data);
			} catch (error) {
				logger.error("JSON parsing error: ", error);
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
				logger.info("IP " + Connection.IP + " ID: " + Connection.ID + " | handshake with: " + (message.Data).toString());
				// abort if Connection already spawned a player
				if (Connection.Player) {
					break;
				}
				// create Player at position 0,0 in Canvas
				Connection.Player = Object.create(Game.spriteObject);
				Connection.Player.height = 45;
				Connection.Player.sourceHeight = 45;
				Connection.Player.x = 0;
				Connection.Player.y = 0;
				// Connection.Player.x = Math.floor(Math.random() * (Game.GP.GameWidth - Connection.Player.width));
				// Connection.Player.y = Math.floor(Math.random() * (Game.GP.GameHeight - Connection.Player.height));
				Connection.Player.Name = message.Data.toString().substring(0, 16);
				Connection.Player.Col = Math.floor(Math.random() * 4);

				// flatten Object
				Connection.Player = helpers.flatten(Connection.Player);
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
	Connection.on("close", function () {
		// remove Connection from Connections
		if (Connection.ID in Connections) {
			logger.info("IP " + Connection.IP + " - disconnected \tID: " + Connection.ID);
			delete Connections[Connection.ID];
		}
	});
});
// game loop on server-side
setInterval(function () {
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
	// broadcast map to all Clients
	for (var ID in Connections) {
		var json = JSON.stringify({
			Type: "map",
			Map: Sprites.Map
		});
		Connections[ID].sendUTF(json);
	}
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
			Players: Sprites.Players,
		});
		Connections[ID].sendUTF(json);
	}
}
// Flatten Object for JSON.stringify
function flatten(object) {
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