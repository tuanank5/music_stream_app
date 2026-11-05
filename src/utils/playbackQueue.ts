type Packet = {
  songId: string;
  sequence: number;
  progressSeconds: number;
  ranges: number[][];
};
export function createPlaybackQueue(
  songId: string,
  newId: () => string,
  send: (id: string, packet: Packet) => Promise<unknown>,
) {
  let id = newId(),
    sequence = 0,
    ready = false,
    ranges: number[][] = [],
    position = 0,
    lastPosition = 0;
  let packet: Packet | undefined, running: Promise<void> | undefined;
  const initialize = async () => {
    await send(id, { songId, sequence: 0, progressSeconds: 0, ranges: [] });
    ready = true;
  };
  let queued = false;
  const queue = {
    sample(progress: number, range?: number[]) {
      position = progress;
      if (ready && range) {
        // Bound offline memory; discarded samples are never credited later.
        if (ranges.length < 360) ranges.push(range);
      }
    },
    flush() {
      if (running) {
        queued = true;
        return running;
      }
      let succeeded = false;
      running = (async () => {
        try {
          if (!ready) {
            await initialize();
            succeeded = true;
            return;
          }
          if (!packet && !ranges.length && position === lastPosition) return;
          if (!packet)
            packet = {
              songId,
              sequence: sequence + 1,
              progressSeconds: position,
              ranges: ranges.splice(0, 120),
            };
          await send(id, packet);
          sequence = packet.sequence;
          lastPosition = packet.progressSeconds;
          packet = undefined;
          succeeded = true;
        } catch (error) {
          if ((error as { status?: number }).status === 409) {
            id = newId();
            sequence = 0;
            ready = false;
            ranges = [];
            packet = undefined;
            lastPosition = 0;
            await initialize();
          }
          throw error;
        }
      })().finally(() => {
        running = undefined;
        if (queued && succeeded) {
          queued = false;
          void queue.flush().catch(() => {});
        }
      });
      return running;
    },
  };
  return queue;
}
