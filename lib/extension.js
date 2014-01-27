var http = require('http');
var util = require('util');
var events = require('events');
var fs = require('fs');

var async = require('async');
var rimraf = require('rimraf');
var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;
var temp = require('temp');

function Extension(settings, callback) {

    var self = this;
    this.httpServer = http.createServer();
    this.server = null;
    this.port = null;
    this.connection = null;
    this.closed = false;
    this.dir = null;

    // id used to keep track of the websockets and their callbacks
    this.id = 0;
    this.callbacks = {};

    var handlers = this._handlers = {
        relayError: function(err) {
            self.emit('error', err);
        },

        onMessage: function(data) {
            self._onMessage(data);
        }
    };

    this.httpServer.listen(0, function() {
        if (self.closed) return;
        self.port = self.httpServer.address().port;

        self.server = new WebSocketServer({server: self.httpServer});
        self.server.on('error', handlers.relayError);

        self.server.once('connection', function(connection) {
            self.connection = connection;
            connection.on('message', handlers.onMessage);
            connection.on('error', handlers.relayError);

            self.emit('connection', connection);
        });

        async.series([
            function(done) {
                temp.mkdir('browser-extension', function(err, dirpath) {
                    if (err) return done(err);
                    self.dir = dirpath;
                    done(null);
                });
            },

            // write manifest.json that defines what background file to use
            // (background.js) and what permissions to give the extension
            function(done) {
                var source = __dirname + '/manifest.json';
                var dest = self.dir + '/manifest.json';

                fs.readFile(source, function(err, manifest) {
                    if (err) return done(err);

                    manifest = JSON.parse(manifest);
                    manifest.permissions.push.apply(manifest.permissions, settings.permissions);

                    fs.writeFile(dest, JSON.stringify(manifest, null, '\t'), done);
                });
            },

            // write background.js the file that connect to the websocket server
            // defined in this file
            function(done) {
                var source = __dirname + '/background.js';
                var dest = self.dir + '/background.js';

                fs.readFile(source, 'utf8', function(err, background) {
                    if (err) return done(err);

                    // Make background.js connect with the websocket server on
                    // this port
                    background = background.replace('$PORT', self.port);
                    fs.writeFile(dest, background, done);
                });
            }
        ], callback);
    });
}
util.inherits(Extension, events.EventEmitter);

Extension.prototype.close = function(callback) {
    if (this.closed) return;
    this.closed = true;

    var self = this;
    var handlers = self._handlers;

    async.series([
        function closeConnection(done) {
            var connection = self.connection;
            if (!connection) return done(null);

            // connection.close will in some cases change readyState to CLOSE
            // synchronizly so let's call that first
            connection.close();

            if (connection.readyState === WebSocket.CLOSED) {
                return done(null);
            }

            connection.once('close', function() {
                connection.removeListener('error', handlers.relayError);
                connection.removeListener('message', handlers.onMessage);
            });
        },

        // close down the the server used for websockets
        function closeServer(done) {
            if (self.server) {
                self.server.close();
                self.server.removeListener('error', handlers.relayError);
            }
            self.httpServer.close(done);
        },

        // remove extension files
        function removeExtensionDir(done) {
            if (!self.dir) return done(null);

            rimraf(self.dir, done);
        }

    ], callback);
};

Extension.prototype._onMessage = function(message) {
    var self = this;
    var data = JSON.parse(message);

    // an error and no id means that we don't know what callback this error
    // belongs to, so relay it
    if (data.err && data.id === null) {
        var err = data.err;
        self.emit('error', new RemoteExtensionError(err.message, err.stack));
        return;
    }

    // At this point it can be assumed that data has an id property
    var callback = this.callbacks[data.id];
    if (!callback) {
        var msg = 'No callback found with id ' + data.id;
        return self.emit('error', new Error(msg));
    }
    delete this.callbacks[data.id];


    if (data.err) {
        callback(new RemoteExtensionError(data.err.message, data.err.stack));
    } else {
        var args = data.args;
        // add null to first argument, since there was no error
        // so, ['result'] become [null, 'result']
        args.unshift(null);
        callback.apply(null, args);
    }
};

Extension.prototype.send = function() {
    // convert arguments to a real array
    var i = arguments.length;
    var args = new Array(i);
    while (i--) args[i] = arguments[i];

    var callback = args.pop();
    if (typeof(callback) !== 'function') {
        throw new Error('Last argument need to be a callback');
    }

    var id = this.id++;
    var data = {
        args: args,
        id: id
    };
    this.callbacks[id] = callback;
    this.connection.send(JSON.stringify(data));
};

module.exports = Extension;

function RemoteExtensionError(msg, stack) {
    Error.call(this);

    this.message = msg;
    this.stack = stack;
    this.name = 'RemoteExtensionError';
}

util.inherits(RemoteExtensionError, Error);

RemoteExtensionError.prototype.inspect = function() {
    return '[' + this.toString() + ']';
};
