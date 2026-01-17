import { EventEmitter } from "events";

// Browser shim for bittorrent-dht
// This prevents build errors when bundling webtorrent for the browser
// The 'torrent-discovery' package imports { Client } from 'bittorrent-dht'
export class Client extends EventEmitter {
  constructor() {
    super();
  }
  destroy() {}
  listen() {}
  addNode() {}
}
export default Client;
