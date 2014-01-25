
var http = require('http');

var test = require('tap').test;
var director = require('director');

var browser = require('../start-browser.js');

// Create a testing server
var router = new director.http.Router();
var server = http.createServer();

server.on('request', router.dispatch.bind(router));
server.listen(0, function() {
    var port = server.address().port;
    var host = 'http://127.0.0.1:' + port;

    // This is setup to block the localhost alias
    var chrome = browser({
        blocked: ['localhost']
    }, function() {

        test('host block rules', function(t) {
            var scriptSrc = 'http://localhost:' + port + '/file.js';

            // returns all cookies there stil exists
            router.get('/', function() {
                this.res.end('<script src="' + scriptSrc + '"></script>');
            });

            var iligalAccess = false;
            router.get('/file.js', function() {
                iligalAccess = true;
                this.res.end('"nothing to see";');
            });

            // Naviagte the browser to a page where a boolean is returned
            chrome.inspector.Page.navigate(host + '/', function(err) {
                t.equal(err, null);
            });

            chrome.inspector.Console.on('messageAdded', function(data) {
                t.equal(data.message.text, 'Failed to load resource: the server ' +
                        'responded with a status of 404 (Not Found)');
                t.equal(data.message.url, scriptSrc);
                t.end();
            });
        });

        test('close chromium', function(t) {
            chrome.close(function() {
                server.close(function() {
                    t.end();
                });
            });
        });
    });

});
