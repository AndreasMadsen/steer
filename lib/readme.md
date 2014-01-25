I will just explain from the beginning:

The entire extension directory has the purpose of getting access to the chrome extension API by creating an RPC connection between the crawler process and chrome. We currently use that API for two purposes:
* take a screenshot
* reset the browser state (such as cookies and alternative storage methods)

Besides that we use the extension to inject a script intro every page we vist, this script is used to block the `window.alert` functions and similar. (This script is called `preinject.js`)

These usecases needs to be specified in the `manifest.json` file.
* take a screenshot requires the `permissions[] = 'tabs'`
* reset browser state requires the `browsingData[] = 'browsingData'`
* block alert requires a "content" script there is loaded on every page `content_scripts[0]`
* to have the chrome extension API on all urls requires the `permissions[] = '<all_urls>'`

Besides that we need to have a persistent (it don't shutdown when the location url changes) script running, this script is called `background.js`. The purpose of this background script is to first create a WebSocket connection (only browser API and chrome extension API exists) beween the background script (`background.js` - client) and the extension script (`extension.js` - server).

However the extension does a little more:
1. It creates a WebSocket server there listen on a random port
2. It then creates a copy of our chrome extension (`manifest.json`, `preinject.js` and `background.js`) and modifies `background.js` so it knows which port to connection to (specific line: `background.replace('$PORT', self.port)`)
3. It sets a `this.dir` property there points to the modified copy and is used in the `browser.js` to set a `'--load-extension=' + self.extension.dir` process argument when starting chrome.
4. It is then used as a pure RPC API between our plugins and the `background.js`.
