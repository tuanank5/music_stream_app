// Synthetic ISO BMFF metadata fixture, not a playable recording.
function box(type, ...parts) {
  const body = Buffer.concat(parts);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(body.length + 8);
  header.write(type, 4, "ascii");
  return Buffer.concat([header, body]);
}
function mp4Audio({
  brand = "isom",
  video = false,
  duration = 180,
  payloadBytes = 16,
} = {}) {
  const track = (id, type) => {
    const tkhd = Buffer.alloc(84);
    tkhd.writeUInt32BE(id, 12);
    const mdhd = Buffer.alloc(24);
    mdhd.writeUInt32BE(48000, 12);
    mdhd.writeUInt32BE(duration * 48000, 16);
    const hdlr = Buffer.alloc(28);
    hdlr.write(type, 8, "ascii");
    const sample = Buffer.alloc(28);
    sample.writeUInt16BE(1, 6);
    sample.writeUInt16BE(2, 16);
    sample.writeUInt16BE(16, 18);
    sample.writeUInt16BE(48000, 24);
    const stsd = Buffer.alloc(8);
    stsd.writeUInt32BE(1, 4);
    return box(
      "trak",
      box("tkhd", tkhd),
      box(
        "mdia",
        box("mdhd", mdhd),
        box("hdlr", hdlr),
        box("minf", box("stbl", box("stsd", stsd, box("mp4a", sample)))),
      ),
    );
  };
  return Buffer.concat([
    box(
      "ftyp",
      Buffer.from(brand.padEnd(4)),
      Buffer.alloc(4),
      Buffer.from("isommp42"),
    ),
    box("moov", track(1, "soun"), ...(video ? [track(2, "vide")] : [])),
    box("mdat", Buffer.alloc(payloadBytes)),
  ]);
}
module.exports = { mp4Audio };
