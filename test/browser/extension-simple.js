
var test = require('tap').test;

var browser = require('../start-browser.js');

test('no premisions given to extension', function(t) {
  var chrome = browser(function () {

    chrome.extension.send('chrome.browsingData.removeCookies', {}, function (err) {
      t.equal(err.message, 'Cannot read property \'removeCookies\' of undefined');

      chrome.close(t.end.bind(t));
    });
  });
});

test('premisions given to extension', function(t) {
  var chrome = browser({
    permissions: ['browsingData']
  }, function () {

    chrome.extension.send('chrome.browsingData.removeCookies', {}, function (err) {
      t.equal(err, null);
      chrome.close(t.end.bind(t));
    });
  });
});
