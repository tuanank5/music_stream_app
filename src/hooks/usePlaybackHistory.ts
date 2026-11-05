import { useEffect, useRef } from "react";
import type { Song } from "../types/domain";

import { createPlaybackSession } from "../services/historyService";

import { useAuth } from "../contexts/AuthContext";
import { errorMessage } from "../utils/feedback";

type Status = {
  currentTime: number;
  duration: number;
  playing: boolean;
  isLoaded: boolean;
  isBuffering: boolean;
  didJustFinish: boolean;
};

export function usePlaybackHistory(
  song: Song | null,
  session: number,
  status: Status,
  fail: (value: string) => void,
) {
  const { user } = useAuth();

  const latest = useRef({ song, status });

  useEffect(() => {
    latest.current = { song, status };
  }, [song, status]);

  const flushRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!user || !song) return;
    const track = song;
    const sender = createPlaybackSession(user.uid, track.id);
    let closed = false,
      ticks = 0;
    let lastTime = Date.now(),
      lastPosition = latest.current.status.currentTime || 0;
    let wasPlaying = latest.current.status.playing;
    const sample = () => {
      if (latest.current.song?.id !== track.id) return;
      const current = latest.current.status,
        now = Date.now();
      const elapsed = (now - lastTime) / 1000,
        delta = current.currentTime - lastPosition;
      const position = Math.max(
        0,
        Math.min(track.durationSeconds, current.currentTime || 0),
      );
      const valid =
        wasPlaying &&
        (current.playing || current.didJustFinish) &&
        current.isLoaded &&
        !current.isBuffering &&
        elapsed > 0 &&
        elapsed <= 3 &&
        delta > 0 &&
        delta <= elapsed + 0.2;
      sender.sample(
        position,
        valid
          ? [Math.max(0, position - Math.min(delta, elapsed)), position]
          : undefined,
      );
      lastTime = now;
      lastPosition = current.currentTime;
      wasPlaying = current.playing;
    };
    const flush = () => {
      sample();
      void sender.flush().catch((error) => {
        if (!closed) fail(errorMessage(error));
      });
    };
    flushRef.current = flush;
    flush();
    const timer = setInterval(() => {
      sample();
      if (++ticks % 10 === 0) flush();
    }, 1000);
    return () => {
      closed = true;
      clearInterval(timer);
      flush();
      if (flushRef.current === flush) flushRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, song?.id, session]);
  useEffect(() => {
    flushRef.current?.();
  }, [status.playing, status.didJustFinish]);
}
