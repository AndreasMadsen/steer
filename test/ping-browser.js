

// evaulates the javascript text "pong" on the browser and returns
// true/false depending on the callback
var id = 0;
module.exports = function ping(browser, callback) {
    var newId = ++id;
    var inject = 'pong-' + newId;
    var command = JSON.stringify(inject);
    var fired = false;

    browser.inspector.Runtime.evaluate(command, function(err, res) {
        // in case the timeout has fired, do nothing
        if (fired) return;

        // got error, return callback
        if (err) return callback(err);

        // don't fire timeout
        clearTimeout(timer);

        var result = res.result.value;
        if (result === inject) {
            return callback(null);
        } else {
            var msg = 'got wrong message ' + result + ' expected ' + inject;
            return callback(new Error(msg));
        }
    });

    // set a timeout to 200 seconds
    var timer = setTimeout(function() {
        fired = true;

        callback(new Error('ping timeout'));
    }, 200);
};
