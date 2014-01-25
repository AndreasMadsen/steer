// correct port get set in extension.js, when this file is copied to it's
// correct location

var connection = new WebSocket('ws://localhost:$PORT');

function callFunction(command, args) {
    // break down command in parts, e.g.
    // 'chrome.tabs.captureVisibleTab' =>
    //      ['chrome', 'tabs', 'captureVisibleTab']
    var parts = command.split('.');
    if (parts.length !== 3) {
        throw new Error('Command ' + command + ' length should be 3');
    }
    var obj = window[parts[0]][parts[1]];
    obj[parts[2]].apply(obj, args);
}

connection.onmessage = function(e) {
    var id = null;
    try {
        var opts = JSON.parse(e.data);
        // id is the identifier that connects the callback
        id = opts.id;
        // first arguments is the command, that is the name of the function to
        // call and the rest is the arguments for that function.
        // E.g. args can be
        //  ['chrome.tabs.captureVisibleTab', null, { quality: 60 }]
        var args = opts.args;

        // Take name of command and save that. E.g. args can then be
        // [null, { quality: 60 }]
        var command = args.shift();

        // Add a callback to the list of args, used to send data back. E.g. args
        // can now be [null, { quality: 60 }, callback]
        //
        // TODO: Support functions that doesn't have a callback as last argument
        args.push(function() {
            connection.send(JSON.stringify({
                id: id,
                args: Array.prototype.slice.apply(arguments)
            }));
        });
        callFunction(command, args);

    } catch (e) {
        connection.send(JSON.stringify({
            id: id,
            err: {
                message: e.message,
                stack: e.stack
            }
        }));
    }
};
