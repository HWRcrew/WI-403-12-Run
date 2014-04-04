var fs = require('fs');
var MapPath = "./maps/";
var Game = require("./game.js");
var logger = require("./logger.js");
var helpers = require("./helpers.js");

function Map(name) {
    this.name = name || undefined;
    this.width = 0;
    this.height = 0;
    this.backgroundColor = undefined;
    this.sprites = {};
};
Map.prototype.buildMap = function (name) {
    var map = this;
    if (name) {
        map.name = name;
    }
    var file = MapPath + map.name + ".json";
    fs.exists(file, function (exists) {
        if (exists) {
            var json = JSON.parse(fs.readFileSync(file, 'utf8'));
            map.width = json.width * Game.GP.GameBlockSize;
            map.height = json.height * Game.GP.GameBlockSize;
            if (json.backgroundcolor) {
                map.backgroundColor = json.backgroundcolor;
            } else {
                map.backgroundColor = '#C3EEF3';
            }
            for (var i = 0; i < json.layers.length; i++) {
                var array = json.layers[i].data;
                var name = json.layers[i].name;
                var data = convertArray(array, json.layers[i].width);
                map.buildLayer(data, name);
            }
        } else {
            logger.error("File does not exist! " + file);
        }
    });
};
Map.prototype.buildLayer = function (dataInput, layer) {
    var rowNumber = dataInput.length;
    var columnNumber = dataInput[0].length;
    var SIZE = Game.GP.tileBlockSize;
    var tilesheetColumns = Game.GP.tileColumns;
    var COLLISIONLAYER = "collision";
    var GOALLAYER = "goal";
    var KILLLAYER = "kill";
    var OTHERLAYER = "other";
    var BACKLAYER = "back";
    var FRONTLAYER = "front";
    var STARTLAYER = "start";
    var collision = false;
    var Sprites = this.sprites;
    switch (layer) {
    case COLLISIONLAYER:
        Sprites.collisionObjects = new Array();
        layer = Sprites.collisionObjects;
        Sprites.realCollisionObjects = new Array();
        collision = true;
        break;
    case GOALLAYER:
        Sprites.goalObjects = new Array();
        layer = Sprites.goalObjects;
        break;
    case KILLLAYER:
        Sprites.killObjects = new Array();
        layer = Sprites.killObjects;
        break;
    case OTHERLAYER:
        Sprites.otherObjects = new Array();
        layer = Sprites.otherObjects;
        break;
    case BACKLAYER:
        Sprites.backObjects = new Array();
        layer = Sprites.backObjects;
        break;
    case FRONTLAYER:
        Sprites.frontObjects = new Array();
        layer = Sprites.frontObjects;
        break;
    case STARTLAYER:
        Sprites.startObjects = new Array();
        layer = Sprites.startObjects;
        break;
    default:
        logger.warn("Layer unknown! Layer: " + layer);
        break;
    }
    for (var row = 0; row < rowNumber; row++) {
        var rectLength = 0;
        for (var column = 0; column < columnNumber; column++) {
            var currentTile = dataInput[row][column];
            // for the realCollisionObjects and to summarize them to bigger objects
            if (collision) {
                if (currentTile !== 0) {
                    rectLength++;
                }
                // case 1 [0,0,3,3,3,0]
                if (currentTile === 0 && rectLength > 0) {
                    // create object with size etc.
                    //                    var object = Object.create(Game.spriteObject);
                    var object = new Game.spriteObject();
                    object.y = row * SIZE;
                    object.x = (column - rectLength) * SIZE;
                    object.width = rectLength * SIZE;
                    helpers.flatten(object);
                    Sprites.realCollisionObjects.push(object);
                    rectLength = 0;
                }
                // case 2 [0,0,3,3,3]
                if (column === columnNumber - 1 && currentTile !== 0) {
                    //                    var object = Object.create(Game.spriteObject);
                    var object = new Game.spriteObject();
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
                //                var object = Object.create(Game.spriteObject);
                var object = new Game.spriteObject();
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
//export
module.exports = Map;
//import with var Map = require('./map.js');