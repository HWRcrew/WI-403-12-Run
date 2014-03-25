//winston is required on the server for this to work - npm install winston
var winston = require('winston');
var logger = new(winston.Logger)({
	transports: [
    new(winston.transports.Console)({
			json: false,
			timestamp: true,
			colorize: true
		}),
    new winston.transports.File({
			filename: __dirname + '/application.log',
			json: false
		})
  ],
	exceptionHandlers: [
    new(winston.transports.Console)({
			json: false,
			timestamp: true
		}),
    new winston.transports.File({
			filename: __dirname + '/exceptions.log',
			json: false
		})
  ],
	exitOnError: false
});
module.exports = logger;
//import with var logger = require('./logger.js');