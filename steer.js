
var util = require('util');
var http = require('http');
var events = require('events');
var spawn = require('child_process').spawn;

var temp = require('temp');
var async = require('async');
var rimraf = require('rimraf');
var inspector = require('inspector');
var Extension = require('./lib/extension.js');

var chromium = 'google-chrome';
if (require('os').platform() === 'darwin') {
    chromium = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}

function BrowserSteer(options, callback) {
    if (!(this instanceof BrowserSteer)) return new BrowserSteer(options, callback);

    var self = this;

    this.inspector = null;
    this.extension = null;
    this.process = null;
    this.userDir = null;
    this.blockServer = null;

    this.closed = false;

    //  attach callback to open event
    if (callback) this.once('open', callback);

    // Do some options validation
    if (typeof options.cache !== 'string') throw TypeError('cache setting must be a string');
    if (typeof options.inspectorPort !== 'number') throw TypeError('inspectorPort setting must be a number');

    // Handle default settings
    if (!options.size) options.size = [800, 600];
    if (!options.blocked) options.blocked = [];
    if (!options.userAgent) options.userAgent = null;
    if (!options.permissions) options.permissions = null;

    // This is not in the prototype chain, since that would unbound
    // it to the this keyword.
    var handlers = this._handlers = {
        relayError: function(err) {
            self.emit('error', err);
        },

        prematureExit: function() {
            self.emit('error', new Error('closed prematurely'));
        }
    };

    async.series([
        // start the extension (and create the extension folder)
        function startupExtension(done) {
            if (self.closed) return done(null);

            self.extension = new Extension(options, done);
            self.extension.on('error', handlers.relayError);
        },

        // create a chrome profile directory
        function createProfile(done) {
            if (self.closed) return done(null);

            temp.mkdir('browser-controller', function(err, dirpath) {
                if (err) return done(err);

                self.userDir = dirpath;

                done(null);
            });
        },

        function clearServer(done) {
            if (self.closed) return done(null);

            // In order to block selected domains a selective hostrules proxy
            // is used to redirect requests with those domains to this server.
            // All this server need to do is then to send a 404 status code
            // indicating that the resource don't exist and end the request.
            self.blockServer = http.createServer(function(req, res) {
                res.statusCode = 404;
                res.end();
            });

            self.blockServer.listen(0, '127.0.0.1', done);
        },

        function startupChromium(done) {
            if (self.closed) return done(null);

            var blockPort = self.blockServer.address().port;

            // create host rules
            var blocked = Array.prototype.concat.apply(
                [],
                options.blocked.map(function(host) {
                    return [host, 'www.' + host, '*.' + host, 'www.*.' + host];
                })
            );
            var hostRules = blocked.map(function(host) {
                return 'MAP ' + host + ' 127.0.0.1:' + blockPort;
            }).join(',');

            // The size that the chrome frame uses on diffrent OS's, to prevent
            // this issue extra window size is added depending on used OS.
            // Otherwice the window size would be diffrent resulting in an
            // inconsistent screenshot size.
            var frame = {
                'darwin': [0, 72],
                'darwin-xvfb': [0, 72],
                'linux': [8, 81],
                'linux-xvfb': [0, 62]
            };

            // Detect the platform
            var platform = process.platform;
            if (Object.prototype.hasOwnProperty.call(process.env, 'DISPLAY')) {
                platform += '-xvfb';
            }

            // Check that the frame is available for this platform
            if (frame.hasOwnProperty(platform) === false) {
                return done(new Error(
                    'platform (' + platform + ') not supported'
                ));
            }

            // Append framesize for this platform
            var windowSize = [
                options.size[0] + frame[platform][0],
                options.size[1] + frame[platform][1]
            ];

            // create custom chromium arguments object
            var argsOptions = [
                '--user-data-dir=' + self.userDir,
                '--disk-cache-dir=' + options.cache,
                '--remote-debugging-port=' + options.inspectorPort,
                '--load-extension=' + self.extension.dir,
                '--host-rules=' + hostRules,
                '--window-size=' + windowSize.join(',')
            ];

            if (options.userAgent) {
                argsOptions.push('--user-agent=' + options.userAgent);
            }

            var args = BrowserSteer.args.concat(argsOptions);

            // spawn a chromium process
            self.process = spawn(chromium, args);

            // error handling
            self.process.on('error', handlers.relayError);
            self.process.stderr.on('error', handlers.relayError);
            self.process.stdout.on('error', handlers.relayError);
            self.process.once('exit', handlers.prematureExit);

            // because there are more async stuff after chrome has started
            // and we want all the output from the start the streams are
            // paused and then when every thing is running they are resumed.
            self.process.stdout.pause();
            self.process.stderr.pause();

            done(null);
        },

        // wait for the extension (defined previous) to connect
        function connectExtension(done) {
            if (self.closed) return done(null);

            if (self.extension.connection) return done();
            self.extension.once('connection', function() {
                done();
            });
        },

        function openInspector(done) {
            if (self.closed) return done(null);

            // connect to webkit inspector
            var port = options.inspectorPort;
            self.inspector = inspector(port, '127.0.0.1', 'about:blank');
            self.inspector.once('connect', done);

            // error handling
            self.inspector.on('error', handlers.relayError);
            self.inspector.once('close', handlers.prematureExit);
        }

    ], function(err) {
        if (err) return self.emit('error', err);

        // output streams was paused at the creation.
        self.process.stdout.resume();
        self.process.stderr.resume();

        self.emit('open');
    });
}
module.exports = BrowserSteer;
util.inherits(BrowserSteer, events.EventEmitter);

// static chromium arguments
BrowserSteer.args = [
    'about:blank',
    '--disk-cache-size=' + 1024 * 1024 * 100, // disk cache is 100 mb

    // No unexpected chrome alerts
    '--no-first-run',
    '--no-default-browser-check',
    '--no-process-singleton-dialog',
    '--safebrowsing-disable-auto-update',

    // Its asummed that these flags will speed up performance
    '--disable-client-side-phishing-detection',
    '--disable-improved-download-protection',
    '--disable-custom-protocol-os-check',
    '--disable-history-quick-provider',
    '--disable-history-url-provider',
    '--disable-prompt-on-repost',
    '--disable-default-apps',
    '--disable-translate',
    '--disable-crl-sets',
    '--disable-plugins',
    '--disable-sync',

    // Disable local storage and session storage
    // This means: window.localStorage is undefined (no webkit prefix)
    // This means: window.sessionStorage is undefined (no webkit prefix)
    // TODO: figure why this storage can't be cleared using a chrome
    // extension, or perhaps we are doing something wrong.
    '--disable-local-storage',
    '--disable-session-storage'

    // TODO: Do we need this, remember to add a test
    // --disable-geolocations
];

function isKilled(child) {
    return !(child && child.signalCode === null && child.exitCode === null);
}

BrowserSteer.prototype.close = function(callback) {
    var self = this;

    var handlers = self._handlers;

    // Prevent close and destroy method from being executed twice
    if (this.closed) return;
    this.closed = true;

    // attach callback to close event
    if (callback) this.once('close', callback);

    async.series([

        function closeInspector(done) {
            var inspector = self.inspector;

            if (inspector) {
                // remove error handlers
                inspector.removeListener('error', handlers.relayError);
                inspector.removeListener('close', handlers.prematureExit);
            }

            if (inspector && inspector.closed === false) {
                // close inspector
                inspector.once('close', done);
                inspector.close();
            } else {
                done(null);
            }
        },

        // if browser is alive, kill it
        function closeChromium(done) {
            var child = self.process;

            // remove error handlers
            if (child) {
                child.removeListener('error', handlers.relayError);
                child.removeListener('exit', handlers.prematureExit);
                child.stderr.removeListener('error', handlers.relayError);
                child.stdout.removeListener('error', handlers.relayError);
            }

            // kill chromium
            if (isKilled(child) === false) {
                // make sure stdout & stderr isn't paused, since the child won't
                // emit 'close' until the file descriptors are destroyed
                child.stdout.resume();
                child.stderr.resume();
                child.once('close', done);
                child.kill();
            } else {
                done(null);
            }
        },

        // close extension
        // Note: this is called after chromium close since
        // the server won't emit close before all connected
        // TCP sockets are dead
        function closeExtension(done) {
            var extension = self.extension;

            if (extension && !extension.closed) {
                extension.removeListener('error', handlers.relayError);

                extension.close(done);
            } else {
                done(null);
            }
        },

        function closeServer(done) {
            if (!self.blockServer) return done(null);

            self.blockServer.close(done);
        },

        // cleanup profile directory
        function removePofile(done) {
            if (!self.userDir) return done(null);

            rimraf(self.userDir, done);
        }

    ], function(err) {
        if (err) return self.emit('error', err);

        // done, emit close
        self.emit('close');
    });
};

BrowserSteer.prototype.destory = function() {
    if (isKilled(this.process) === false) {
        this.process.kill();
    }
};
