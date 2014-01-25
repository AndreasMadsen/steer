
var path = require('path');

var test = require('tap').test;

var browser = require('../start-browser.js');
var pingBrowser = require('../ping-browser.js');

function isAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return false;
    }
}

test('simple browser startup and close', function(t) {
    t.plan(2);

    // once chrome is open, ping it and close
    var chrome = browser(function() {

        pingBrowser(chrome, function(err) {
            t.equal(err, null, 'no error');

            chrome.close();
        });
    });

    // once chrome is closed we are done
    chrome.once('close', function() {
        t.equal(isAlive(chrome.process.pid), false, 'chromium is closed');

        t.end();
    });
});

test('premature inspector exit - SIGTERM', function(t) {
    t.plan(2);

    // once chrome is open, ping it and close
    var chrome = browser(function() {
        process.kill(chrome.process.pid, 'SIGTERM');
    });

    // once chrome is closed we are done
    chrome.once('error', function(err) {
        t.equal(err.message, 'closed prematurely', 'got error message');

        chrome.close();
    });

    // once chrome is closed we are done
    chrome.once('close', function() {
        t.equal(isAlive(chrome.process.pid), false, 'chromium is closed');

        t.end();
    });
});

test('premature chromium exit - SIGKILL', function(t) {
    t.plan(2);

    // once chrome is open, ping it and close
    var chrome = browser(function() {
        process.kill(chrome.process.pid, 'SIGKILL');
    });

    // once chrome is closed we are done
    chrome.once('error', function(err) {
        t.equal(err.message, 'closed prematurely', 'got error message');

        chrome.close();
    });

    // once chrome is closed we are done
    chrome.once('close', function() {
        t.equal(isAlive(chrome.process.pid), false, 'chromium is closed');

        t.end();
    });
});

test('immediately close', function(t) {
    t.plan(2);

    var chrome = browser(function() {});

    // once chrome is closed we are done
    chrome.once('close', function() {
        t.equal(chrome.process, null, 'chromium never started');
        t.equal(chrome.inspector, null, 'inspector never connected');

        t.end();
    });

    chrome.close();
});

test('destory method', function(t) {
    t.plan(1);

    var chrome = browser(function() {
        chrome.destory();
    });

    // once chrome is closed we are done
    chrome.once('error', function(err) {
        t.equal(err.message, 'closed prematurely');

        chrome.close(function() {
            t.end();
        });
    });
});

test('regression test for race condition in close-callback', function(t) {
    t.plan(2);

    // open once chrome instance that listen to a prefedined inspector port
    var chrome1 = browser(function() {

        // open another chrome instance that lsiten to the same inspector port
        var chrome2 = browser();

        // chrome2 should then error (since chrome2 listen to the same port)
        chrome2.once('error', function(err) {
            t.equal(err.message, 'Another inspector is already listning');

            // Make sure that chrome2 get closed properly - this is the race
            // condition
            chrome2.once('close', function() {
                t.equal(isAlive(chrome2.process.pid), false, 'chrome closed');

                // cleanup, close chrome1
                chrome1.close();
            });
            chrome2.close();
        });
    });

    // once chrome1 is closed we are done
    chrome1.once('close', function() {
        t.end();
    });
});
