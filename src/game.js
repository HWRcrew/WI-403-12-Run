var GlobalProperties = {
    GameWidth: 768,
    GameHeight: 384,
    // GameFrameTime in milliseconds
    GameFrameTime: 30
};

// TODO RunGameFrame


// Export for server.js
if (typeof exports !== "undefined") {
    exports.GlobalProperties = GlobalProperties;
    // TODO Add other exports, if any
}