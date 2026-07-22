const http = require('node:http');
const config = require('@core/util/functions/config');
const debug = require('@core/util/functions/debug');
const createApp = require('./app');
const voiceLiveRelayService = require('@src/services/VoiceLiveRelayService');

const app = createApp();
const host = config('server.host', '127.0.0.1');
const port = config('server.port', 4000);
const server = http.createServer(app);

debug(`server: starting at http://${host}:${port}`);

voiceLiveRelayService.attach(server);

server.listen(port, host, () => {
  debug(`server: listening at http://${host}:${port}`);
  console.log(`Officer Charles backend running on http://${host}:${port}`);
});

module.exports = server;
