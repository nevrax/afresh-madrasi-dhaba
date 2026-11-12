/** Compatibility with __Packages/Rijndael.as, encrypt(src, key), as called by frame 6.
 * This public SWF constant is protocol data, not a user credential or a security secret.
 * AES-128 ECB, no IV, zero padding only for incomplete blocks, lowercase hexadecimal.
 * The source consumes UTF-16 code units (not UTF-8) and only the first 16 key characters.
 */
const PUBLIC_SWF_KEY = 'katUnzI$n0wcH@y03ot3c#N0$oluT10n$';

function multiply(x: number, y: number): number {
  let result = 0;
  for (let bit = 1; bit < 256; bit *= 2) {
    if (x & bit) result ^= y;
    y <<= 1;
    if (y & 256) y ^= 0x11b;
  }
  return result;
}

// Generate the standard Rijndael S-box instead of retaining a second opaque table.
const sbox = Array.from({ length: 256 }, (_, byte) => {
  let inverse = byte === 0 ? 0 : 1;
  if (byte) for (let exponent = 0; exponent < 254; exponent++) inverse = multiply(inverse, byte);
  let result = inverse ^ 0x63;
  for (let shift = 1; shift <= 4; shift++) result ^= ((inverse << shift) | (inverse >>> (8 - shift))) & 255;
  return result;
});

function expandKey(): number[] {
  const result = Array.from({ length: 16 }, (_, index) => PUBLIC_SWF_KEY.charCodeAt(index));
  let rcon = 1;
  for (let offset = 16; offset < 176; offset += 4) {
    let word = result.slice(offset - 4, offset);
    if (offset % 16 === 0) {
      word = [sbox[word[1]], sbox[word[2]], sbox[word[3]], sbox[word[0]]];
      word[0] ^= rcon;
      rcon = multiply(rcon, 2);
    }
    for (let i = 0; i < 4; i++) result.push(result[offset - 16 + i] ^ word[i]);
  }
  return result;
}
const roundKeys = expandKey();

function encryptBlock(block: number[]): number[] {
  const state = block.slice();
  const addKey = (round: number): void => { for (let i = 0; i < 16; i++) state[i] ^= roundKeys[round * 16 + i]; };
  addKey(0);
  for (let round = 1; round <= 10; round++) {
    // AS2 table lookup for a code unit >255 yields undefined; subsequent bitwise
    // operations coerce it to zero. Keep that quirk instead of silently UTF-8 encoding.
    const substituted = state.map(value => sbox[value] ?? 0);
    for (let row = 0; row < 4; row++) for (let column = 0; column < 4; column++) state[column * 4 + row] = substituted[((column + row) % 4) * 4 + row];
    if (round < 10) {
      for (let column = 0; column < 4; column++) {
        const offset = column * 4;
        const a = state.slice(offset, offset + 4);
        for (let row = 0; row < 4; row++) state[offset + row] = multiply(a[row], 2) ^ multiply(a[(row + 1) % 4], 3) ^ a[(row + 2) % 4] ^ a[(row + 3) % 4];
      }
    }
    addKey(round);
  }
  return state;
}

export function legacyVerification(plaintext: string): string {
  const units = Array.from({ length: plaintext.length }, (_, index) => plaintext.charCodeAt(index));
  while (units.length % 16) units.push(0);
  let hex = '';
  for (let offset = 0; offset < units.length; offset += 16) {
    for (const byte of encryptBlock(units.slice(offset, offset + 16))) hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}
