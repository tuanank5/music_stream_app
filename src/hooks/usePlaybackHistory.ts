import { useEffect, useRef } from "react";
import type { Song } from "../types/domain";

import {
  newHistoryId,
  savePlayback,
} from "../services/historyService";

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

  useEffect(() => {
    if (!user || !song) return;

    const uid = user.uid;
    const track = song;
    const id = newHistoryId(uid);

    let heard = 0;
    let lastPosition = 0;
    let lastTime = Date.now();
    let lastSaved = 0;

    let saving = false;
    let queued = false;
    let closed = false;

    let capturedStatus = latest.current.status;

    const flush = async () => {
      if (saving) {
        queued = true;
        return;
      }

      saving = true;

      const currentStatus = capturedStatus;
      const heardNow = heard;

      try {
        await savePlayback(
          uid,
          id,
          track,
          currentStatus.currentTime || 0,
          currentStatus.duration || track.durationSeconds,
          heardNow,
          currentStatus.didJustFinish ||
            (
              currentStatus.duration > 0 &&
              currentStatus.currentTime >=
                currentStatus.duration - 1
            ),
        );

        lastSaved = heardNow;
      } catch (e) {
        if (!closed) {
          fail(`Lịch sử: ${errorMessage(e)}`);
        }
      } finally {
        saving = false;

        if (queued) {
          queued = false;
          void flush();
        }
      }
    };

    void flush();

    const timer = setInterval(() => {
      const now = Date.now();
      const currentStatus = latest.current.status;
      const elapsed = (now - lastTime) / 1000;

      capturedStatus = currentStatus;

      const delta =
        currentStatus.currentTime - lastPosition;

      if (
        currentStatus.isLoaded &&
        currentStatus.playing &&
        !currentStatus.isBuffering &&
        elapsed > 0 &&
        elapsed <= 3 &&
        delta > 0 &&
        delta <= elapsed + 0.75
      ) {
        heard += Math.min(delta, elapsed);
      }

      lastTime = now;
      lastPosition = currentStatus.currentTime;

      if (heard - lastSaved >= 10) {
        void flush();
      }
    }, 1000);

    return () => {
      closed = true;
      clearInterval(timer);
      void flush();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, song?.id, session]);
}