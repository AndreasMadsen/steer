
var test = require('tap').test;

var browser = require('../start-browser.js');

var chrome = browser(function() {
    test('extension conncetion error', function(t) {
        chrome.once('error', function(err) {
            t.ok(true, 'relay to browser');
            t.end();
        });

        chrome.extension.connection.emit('error', new Error());
    });

    test('extension server error', function(t) {
        chrome.once('error', function(err) {
            t.equal(err.message, 'test error');
            t.end();
        });

        chrome.extension.server.emit('error', new Error('test error'));
    });

    test('close chromium', function(t) {
        chrome.close(function() {
            t.end();
        });
    });
});
