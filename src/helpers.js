// Flatten Object for JSON.stringify
function flatten(object) {
	for (var key in object) {
		object[key] = object[key];
	}
	return object;
}
exports.flatten = flatten;