
var test = require('tap').test;

var browser = require('../start-browser.js');

var chrome = browser(function() {

    test('extension bad command length error', function(t) {

        // send a to short command
        chrome.extension.send('foo.bar', function(err, screenshot) {
            var errorMessage = 'Command foo.bar length should be 3';

            t.type(err, Error);
            t.equal(err.name, 'RemoteExtensionError');
            t.equal(err.message, errorMessage);
            t.type(err.stack, 'string');

            if (err.stack) {
                var firstLine = err.stack.match(/^(.*)\n/)[1];
                t.equal(firstLine, 'Error: ' + errorMessage);
            }

            t.end();
        });
    });

    test('extension bad json error', function(t) {

        // send a short command that isn't correct json
        // note: This should really not happen!
        chrome.once('error', function(err) {
            t.equal(err.message, 'Unexpected end of input');
            t.end();
        });
        chrome.extension.connection.send('{"hello": "bar"');
    });

    test('send, last argument is a callback', function(t) {
        try {
            chrome.extension.send('foo', 'bar');
            t.ok(false, 'should throw');
        } catch (e) {
            t.type(e, Error);
        }
        t.end();
    });

    test('close chromium', function(t) {
        chrome.close(function() {
            t.end();
        });
    });
});
