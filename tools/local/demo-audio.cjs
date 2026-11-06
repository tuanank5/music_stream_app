// Original synthesized PCM, served only by the local emulator backend.
// Duration derives from sample count, not guessed metadata for an MP3 file.
const SAMPLE_RATE = 16000;
const tracks = Object.freeze({
  "/local-audio/sample-long.wav": { frames: SAMPLE_RATE * 45, frequency: 220 },
  "/local-audio/sample-short.wav": { frames: SAMPLE_RATE * 12, frequency: 330 },
});
const cache = new Map();
function demoAudio(path) {
  const track = Object.hasOwn(tracks, path) ? tracks[path] : null;
  if (!track) return null;
  if (!cache.has(path)) {
    const bytes = track.frames * 2;
    const wav = Buffer.alloc(44 + bytes);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + bytes, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20); // PCM
    wav.writeUInt16LE(1, 22); // mono
    wav.writeUInt32LE(SAMPLE_RATE, 24);
    wav.writeUInt32LE(SAMPLE_RATE * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(bytes, 40);
    for (let i = 0; i < track.frames; i++) {
      const time = i / SAMPLE_RATE;
      const envelope = Math.min(
        1,
        time * 10,
        ((track.frames - i) / SAMPLE_RATE) * 10,
      );
      const note =
        track.frequency * [1, 1.25, 1.5, 1.25][Math.floor(time / 2) % 4];
      const sample = Math.sin(2 * Math.PI * note * time) * envelope * 0.12;
      wav.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
    }
    cache.set(path, wav);
  }
  return cache.get(path);
}
function demoTrack(index) {
  const path = Object.keys(tracks)[index % 2];
  return { audioUrl: path, durationSeconds: tracks[path].frames / SAMPLE_RATE };
}
function serveDemoAudio(req, res) {
  const audio = demoAudio(req.path);
  if (!audio) return res.sendStatus(404);
  res.set({
    "Content-Type": "audio/wav",
    "Accept-Ranges": "bytes",
    "Access-Control-Expose-Headers": "Accept-Ranges, Content-Range",
  });
  const range = req.headers.range;
  if (!range) return res.status(200).send(audio);
  // Express uses the maintained range-parser implementation for HTTP ranges.
  const ranges = req.range(audio.length);
  if (
    !Array.isArray(ranges) ||
    ranges.type !== "bytes" ||
    ranges.length !== 1
  ) {
    res.set("Content-Range", `bytes */${audio.length}`);
    return res.sendStatus(416);
  }
  const { start, end } = ranges[0];
  res.set("Content-Range", `bytes ${start}-${end}/${audio.length}`);
  return res.status(206).send(audio.subarray(start, end + 1));
}
module.exports = { demoAudio, demoTrack, serveDemoAudio };
