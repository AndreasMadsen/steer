
var http = require('http');
var path = require('path');

var test = require('tap').test;
var filed = require('filed');
var director = require('director');

var browser = require('../start-browser.js');

// Create a testing server
var router = new director.http.Router();
var server = http.createServer();

// returns all cookies there stil exists
var fixturePath = path.resolve(__dirname, '../fixture/http-third-party.html');
router.get('/', function() {
    this.req.pipe(filed(fixturePath)).pipe(this.res);
});

server.on('request', router.dispatch.bind(router));
server.listen(0, function() {
    var host = 'http://127.0.0.1:' + server.address().port;

    var chrome = browser(function() {

        // Test immediately dialog overwrite
        test('third party programs are disabled', function(t) {
            chrome.inspector.Page.navigate(host + '/', function(err) {
                t.equal(err, null);
            });

            chrome.inspector.Console.on('messageAdded', function(data) {
                var activePlugins = data.message.parameters[0].preview.properties.map(function (item) {
                    return item.value;
                });

                t.equal(activePlugins.indexOf('Silverlight.plugin'), -1);

                var flashName = 'Flash Player Plugin for Chrome.plugin';
                t.equal(activePlugins.indexOf(flashName), -1);
                t.equal(activePlugins.indexOf('PepperFlashPlayer.plugin'), -1);

                t.equal(activePlugins.indexOf('JavaAppletPlugin.plugin'), -1);

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
