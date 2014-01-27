
var test = require('tap').test;
var browser = require('../start-browser.js');

test('default window size', function(t) {
  var chrome = browser(function () {

    chrome.inspector.Runtime.evaluate(
      '(function () {' +
        'return JSON.stringify({width: window.innerWidth, height: window.innerHeight });' +
      '})();', function (err, res) {
        var result = JSON.parse(res.result.value);

        t.deepEqual(result, {
          width: 800,
          height: 600
        });

        chrome.close(t.end.bind(t));
      }
    );
  });
});

test('custom window size', function(t) {
  var chrome = browser({
      size: [600, 400]
    }, function () {

    chrome.inspector.Runtime.evaluate(
      '(function () {' +
        'return JSON.stringify({width: window.innerWidth, height: window.innerHeight });' +
      '})();', function (err, res) {
        var result = JSON.parse(res.result.value);

        t.deepEqual(result, {
          width: 600,
          height: 400
        });

        chrome.close(t.end.bind(t));
      }
    );
  });
});
