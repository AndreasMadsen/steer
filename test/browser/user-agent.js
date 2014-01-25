
var http = require('http');

var test = require('tap').test;
var director = require('director');

var browser = require('../start-browser.js');

// Create a testing server
var router = new director.http.Router();
var server = http.createServer();

server.on('request', router.dispatch.bind(router));
server.listen(0, function() {
    var host = 'http://127.0.0.1:' + server.address().port;

    var chrome = browser(function() {

        test('custom user-agent send by browser', function(t) {
            var userAgentSend = null;

            // returns all cookies there stil exists
            router.get('/get', function() {
                userAgentSend = this.req.headers['user-agent'];
                this.res.end();
            });

            // Executed when page is loaded
            chrome.inspector.Page.once('loadEventFired', function() {
                // the server did rescive a custom user agent
                t.equal(userAgentSend, 'Agent/1.0 (custom)');

                t.end();
            });

            // Naviagte the browser to the page where userAgentSend is set
            chrome.inspector.Page.navigate(host + '/get', function(err) {
                t.equal(err, null);
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
