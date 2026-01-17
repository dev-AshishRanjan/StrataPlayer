// Browser shim for bittorrent-dht
// This prevents build errors when bundling webtorrent for the browser
// The 'torrent-discovery' package imports { Client } from 'bittorrent-dht'
export class Client {
  constructor() {}
  on() {
    return this;
  }
  once() {
    return this;
  }
  off() {
    return this;
  }
  destroy() {}
  listen() {}
  addNode() {}
}
export default Client;
