#steer

> Use steer to control your chrome (the browser)

## Installation

```sheel
npm install steer
```

## Dependencies

You will need to install `google-chrome` (not chromeium) on your machine first.
You can find it here: [https://www.google.com/intl/en/chrome/browser/](https://www.google.com/intl/en/chrome/browser/)

## Documentation

When requireing this module you get a steer constructor.

```javascript
var steer = require('steer');
```

When createing a new instance a `google-chrome` process is stared with it own
private profile. This means it won't interfere with other `google-chrome` processes.

```javascript
var chrome = steer(settings, [callback]);
```

The `steer` contructor takes a warity of settings where some are optional.

* `cache` (required). The directory where the cached files will be stored. This
  should be reused when your application craches.
* `inspectorPort` (required). A free port number for localhost used for the
  WebKit inspector protocol communication.
* `userAgent` (optional). This is the user-agent header chrome will be using.
  If not set this will just the long user-agent chrome will usually send.
* `blocked` (optional). An array of hostnames there will return a 404. This
  could be ad sites or other websites you don't which to spend time on.
* `size` (optional). This will be the inner size of the chrome frame. By
  default this is `[800, 600]` where `800` is the width and `600` is the height.

```javascript
var chrome = steer({
    cache: path.resolve(__dirname, 'cache'),
    inspectorPort: 7510,
    userAgent: 'SteerBot/1.0',
    blocked: [
        'googleadservices.com',
        'google-analytics.com'
    ],
    size: [1280, 1024]
});
```

### chrome.inspector

An insterface for the WebKit remote inspector API, for documentation see the
[inspector](https://github.com/admazely/inspector) module.

For example, to navigate to a page:

```javascript
chrome.inspector.Page.navigate('http://google.com', function(err) {
    if (err) throw err;

    // chrome is now at google.com, but the page might stil be loading
});
```

Another example, to evaluate some javascript within the browser:

```javascript
inspector.Runtime.evaluate(
    'return document.innerHTML.length;',
    '', true, false, undefined, true,
    function (err, response) {
        console.log(response.result.value);
    }
);
```

### chrome.extension

A simple interface for the chrome extension API. For the full API see
[http://developer.chrome.com/extensions/api_index.html](http://developer.chrome.com/extensions/api_index.html)

For example, to take a screenshot do:

```javascript
var BASE64_URL_PREFIX = 'data:image/jpeg;base64,';

chrome.extension.send('chrome.tabs.captureVisibleTab', null, { quality: 60 }, function(err, img) {
    var data = new Buffer(img.slice(BASE64_URL_PREFIX.length), 'base64');
    fs.writeFile('image.jpeg', data, function () {
        // screenshot saved
    });
});
```

Another example, to clear the cookies and all other sort of browser states do:

```javascript
chrome.extension.send('chrome.browsingData.remove', {}, {
    'webSQL': true,
    'cookies': true,
    'indexedDB': true
}, function (err) {
    if (err) throw err;

    // stuff removed
});
```

### chrome.process

The standard node process object for the `google-chrome` process.

```javascript
chrome.once('open', function () {
    chrome.process.stdout.pipe(process.stdout);
    chrome.process.stderr.pipe(process.stderr);
});
```

### chrome.close([callback])

Close the browser in a gracefull way, this will cleanup the temporary
directories and shutdown the a server used for blocking requests and finally
close the browser. The optional callback is just attached to the `close` event.

### chrome.destory()

This will simply kill the browser. You should call `process.exit()` after this
as there will still be active stuff running.

### chrome.on('open')

Everything is ready, you can start navigating the browser now. Until this
event fires you should expect `inspector`, `extensions` and `process` to be
null.

### chrome.on('close')

This event emits when the browser closes.

### chrome.on('error')

An error occurred. As there are many things running in order to manage the
remote connection (actually there are more) this can be caused by quite a lot.

##License

**The software is license under "MIT"**

> Copyright (c) 2014 Peter V. T. Schlegel
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
> THE SOFTWARE.
