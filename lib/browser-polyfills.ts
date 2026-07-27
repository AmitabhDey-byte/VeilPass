import { Buffer as BrowserBuffer } from "buffer";

/**
 * Midnight's browser-capable dependencies still reference Node's global Buffer
 * in a few serialization paths. Vite does not create that global by default.
 */
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = BrowserBuffer;
}
