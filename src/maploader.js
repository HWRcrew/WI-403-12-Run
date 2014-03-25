var fs = require('fs');
var MapPath = "./maps/";
var Game = require("./game.js");
var helpers = require("./helpers.js");
/**
 * converts one-dimensional array into two-dimensional array
 */
function convertArray(array, columns) {
	if (array.length % columns !== 0) {
		logger.warn("Array has not the right size(" + array.length + ") for that number of columns(" + columns + ")!");
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
/**
 * builds up the environment out of a object in the tiled-format (JSON)
 */
function buildMap(Sprites, jsonMap) {
	var file = MapPath + jsonMap + ".json";
	fs.exists(file, function (exists) {
		if (exists) {
			var map = JSON.parse(fs.readFileSync(file, 'utf8'));
			for (var i = 0; i < map.layers.length; i++) {
				var array = map.layers[i].data;
				var width = map.layers[i].width;
				var name = map.layers[i].name
				data = convertArray(array, width);
				buildLayer(Sprites, data, name);
			}
		} else {
			logger.warn("File does not exist!");
		}
	});
};
/**
 * builds single layers
 */
function buildLayer(Sprites, layerInput, layer) {
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
		logger.warn("Layer unknown!");
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
					helpers.flatten(object);
					Sprites.realCollisionObjects.push(object);
					rectLength = 0;
				}
				// case 2 [0,0,3,3,3]
				if (column === COLUMNS - 1 && currentTile !== 0) {
					var object = Object.create(Game.spriteObject);
					object.y = row * SIZE;
					object.x = (column - (rectLength - 1)) * SIZE;
					object.width = rectLength * SIZE;
					helpers.flatten(object);
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
				helpers.flatten(object);
				layer.push(object);
			}
		}
	}
};
exports.buildMap = buildMap;
//import with var maploader = require('./maploader.js');