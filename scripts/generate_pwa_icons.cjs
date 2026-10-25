const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePNG(width, height, drawFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image bytes: 1 filter byte per scanline + width * 4 bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Icon Drawing function for Hostel Ease:
// Emerald green background with rounded corners, white/mint house silhouette, warm gold window badge
function drawHostelIcon(x, y, w, h) {
  const scale = w / 192.0;
  const rCorner = 36 * scale;

  // Check rounded corner boundary
  let inBounds = true;
  if (x < rCorner && y < rCorner) {
    const dx = rCorner - x;
    const dy = rCorner - y;
    if (dx * dx + dy * dy > rCorner * rCorner) inBounds = false;
  } else if (x > w - rCorner && y < rCorner) {
    const dx = x - (w - rCorner);
    const dy = rCorner - y;
    if (dx * dx + dy * dy > rCorner * rCorner) inBounds = false;
  } else if (x < rCorner && y > h - rCorner) {
    const dx = rCorner - x;
    const dy = y - (h - rCorner);
    if (dx * dx + dy * dy > rCorner * rCorner) inBounds = false;
  } else if (x > w - rCorner && y > h - rCorner) {
    const dx = x - (w - rCorner);
    const dy = y - (h - rCorner);
    if (dx * dx + dy * dy > rCorner * rCorner) inBounds = false;
  }

  if (!inBounds) {
    return [0, 0, 0, 0]; // Transparent outside rounded corner
  }

  // Base background: #047857 (Emerald 700) with subtle gradient to #065F46
  const bgGrad = Math.floor(y / h * 20);
  const bgR = 4;
  const bgG = 120 - bgGrad;
  const bgB = 87 - bgGrad;

  // Coordinate in 192x192 space
  const nx = x / scale;
  const ny = y / scale;

  // Gold notification / sun dot at cx=96, cy=74, r=10
  const dotDx = nx - 96;
  const dotDy = ny - 74;
  const inDot = (dotDx * dotDx + dotDy * dotDy) <= 100;

  // Door at x=76..116, y=104..148
  const inDoor = (nx >= 76 && nx <= 116 && ny >= 104 && ny <= 148);

  // House body and roof
  // Roof triangle: (48, 92) to (96, 48) to (144, 92)
  // Body: x=48..144, y=92..148
  let inHouse = false;
  if (ny >= 92 && ny <= 148 && nx >= 48 && nx <= 144) {
    inHouse = true;
  } else if (ny >= 48 && ny < 92) {
    const progress = (ny - 48) / (92 - 48); // 0 at peak, 1 at eaves
    const leftX = 96 - progress * 48;
    const rightX = 96 + progress * 48;
    if (nx >= leftX && nx <= rightX) {
      inHouse = true;
    }
  }

  if (inDot) {
    return [251, 191, 36, 255]; // Amber #FBBF24
  }
  if (inDoor) {
    return [6, 78, 59, 255]; // Deep pine #064E3B
  }
  if (inHouse) {
    return [16, 185, 129, 255]; // Bright Emerald #10B981
  }

  return [bgR, bgG, bgB, 255];
}

const outDir = path.resolve(__dirname, '../public');

fs.writeFileSync(path.join(outDir, 'icon-192.png'), generatePNG(192, 192, drawHostelIcon));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), generatePNG(512, 512, drawHostelIcon));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), generatePNG(180, 180, drawHostelIcon));

console.log('✅ Generated icon-192.png, icon-512.png, and apple-touch-icon.png successfully!');
