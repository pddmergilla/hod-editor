'use strict';
// Applies the Castle's Kitchen PPF3 to a clean US ROM, in the browser or in Node.
// PPF3: "PPF30", method 2, 50-byte description, image type, block check, undo, dummy,
// [1024-byte block check], then records of u64 offset, u8 length, data[, undo data].
(function (global) {
  function parsePpf(input) {
    const b = input instanceof Uint8Array ? input : new Uint8Array(input);
    const ascii = (o, n) => String.fromCharCode(...b.subarray(o, o + n));
    if (b.length < 60 || ascii(0, 5) !== 'PPF30' || b[5] !== 2) throw new Error('This is not a PPF3 patch.');
    const blockCheck = b[57] === 1, undo = b[58] === 1;
    const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const records = [];
    let pos = blockCheck ? 1084 : 60, end = 0;
    while (pos < b.length) {
      if (pos + 9 > b.length) throw new Error('The patch ends inside a record.');
      const offset = Number(view.getBigUint64(pos, true)), length = b[pos + 8];
      pos += 9;
      if (!length || pos + length * (undo ? 2 : 1) > b.length) throw new Error('The patch ends inside a record.');
      records.push({offset, length, data: pos});
      pos += length * (undo ? 2 : 1);
      end = Math.max(end, offset + length);
    }
    return {bytes: b, description: ascii(6, 50).trim(), blockCheck: blockCheck ? b.subarray(60, 1084) : null, records, end};
  }

  function apply(input, ppf) {
    if (ppf.blockCheck && ppf.blockCheck.some((x, i) => input[0x9320 + i] !== x))
      throw new Error('This ROM does not match the patch block check.');
    const output = new Uint8Array(Math.max(input.length, ppf.end));
    output.set(input);
    for (const {offset, length, data} of ppf.records) output.set(ppf.bytes.subarray(data, data + length), offset);
    return output;
  }

  let table = null;
  function crc32(bytes, crc = 0) {
    if (!table) {
      table = new Int32Array(256);
      for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; }
    }
    let c = ~crc;
    for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return ~c >>> 0;
  }
  const hex = n => n.toString(16).toUpperCase().padStart(8, '0');

  async function sha256(bytes) {
    if (!global.crypto?.subtle) throw new Error('Open the page from a local file or a secure website.');
    const digest = new Uint8Array(await global.crypto.subtle.digest('SHA-256', bytes));
    return Array.from(digest, n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  const api = {parsePpf, apply, crc32, hex, sha256};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.HodKitchenCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
