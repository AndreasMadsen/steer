
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

  // returns all cookies there stil exists
  var userAgentSend = null;
  router.get('/get', function() {
    userAgentSend = this.req.headers['user-agent'];
    this.res.end();
  });

  test('default user-agent send by browser', function(t) {
    var chrome = browser(function () {

      // Executed when page is loaded
      chrome.inspector.Page.once('loadEventFired', function() {
        // the server did rescive a custom user agent
        t.equal(userAgentSend.slice(0, 11), 'Mozilla/5.0');

        chrome.close(t.end.bind(t));
      });

      // Naviagte the browser to the page where userAgentSend is set
      chrome.inspector.Page.navigate(host + '/get', function(err) {
        t.equal(err, null);
      });
    });
  });

  test('custom user-agent send by browser', function(t) {
    var chrome = browser({
      userAgent: 'CustomAgent/1.0'
    }, function () {

      // Executed when page is loaded
      chrome.inspector.Page.once('loadEventFired', function() {
        // the server did rescive a custom user agent
        t.equal(userAgentSend, 'CustomAgent/1.0');

        chrome.close(t.end.bind(t));
      });

      // Naviagte the browser to the page where userAgentSend is set
      chrome.inspector.Page.navigate(host + '/get', function(err) {
        t.equal(err, null);
      });
    });
  });

  test('close server', function (t) {
    server.close(function() {
      t.end();
    });
  });

});
