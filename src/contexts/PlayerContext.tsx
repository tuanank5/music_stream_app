import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { Song } from "../types/domain";
import { useAuth } from "./AuthContext";
import { errorMessage } from "../utils/feedback";
import { usePlaybackHistory } from "../hooks/usePlaybackHistory";
const demos: Record<string, number> = {
  demo1: require("../../assets/audio/demo1.mp3"),
  demo2: require("../../assets/audio/demo2.mp3"),
  demo3: require("../../assets/audio/demo3.mp3"),
};
type PlayerState = {
  current: Song | null;
  playing: boolean;
  loading: boolean;
  error: string;
  repeat: boolean;
  repeatAll: boolean;
};
type PlayerProgress = { position: number; duration: number };
type PlayerActions = {
  setRepeat: (v: boolean) => void;
  setRepeatAll: (v: boolean) => void;
  removeSong: (id: string) => void;
  play: (s: Song, queue?: Song[]) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => Promise<void>;
};
const StateContext = createContext<PlayerState | null>(null);
const ProgressContext = createContext<PlayerProgress | null>(null);
const ActionsContext = createContext<PlayerActions | null>(null);
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <PlayerSession key={user?.uid ?? "guest"}>{children}</PlayerSession>;
}
function PlayerSession({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [current, setCurrent] = useState<Song | null>(null),
    [session, setSession] = useState(0),
    [error, setError] = useState(""),
    [repeat, setRepeat] = useState(false);
  const [repeatAll, setRepeatAll] = useState(false);
  usePlaybackHistory(current, session, status, setError);
  const queue = useRef<Song[]>([]);
  const now = useRef<Song | null>(null);
  const ended = useRef(false);
  const latest = useRef(status);
  const live = useRef(true);
  const generation = useRef(0);
  const closeSession = useCallback(() => {
    live.current = false;
    generation.current++;
  }, []);
  useEffect(() => {
    latest.current = status;
  }, [status]);
  useEffect(() => {
    live.current = true;
    setAudioModeAsync({ playsInSilentMode: true }).catch((e) => {
      if (live.current) setError(errorMessage(e));
    });
    return closeSession;
  }, [closeSession]);
  const play = useCallback(
    (song: Song, list?: Song[]) => {
      if (!live.current) return;
      const source = song.audioUrl
        ? { uri: song.audioUrl }
        : demos[song.audioKey];
      if (!source) {
        setError("Bài hát chưa có URL âm thanh hoặc audioKey demo hợp lệ.");
        return;
      }
      try {
        if (list) queue.current = list;
        else if (!queue.current.some((x) => x.id === song.id))
          queue.current = [song];
        now.current = song;
        generation.current++;
        setCurrent(song);
        setSession((value) => value + 1);
        setError("");
        ended.current = false;
        player.replace(source);
        player.play();
      } catch (e) {
        setError(errorMessage(e));
      }
    },
    [player],
  );
  const move = useCallback(
    (step: number) => {
      const q = queue.current;
      if (!q.length) return;
      const i = q.findIndex((x) => x.id === now.current?.id);
      play(q[(i + step + q.length) % q.length]);
    },
    [play],
  );
  useEffect(() => {
    if (!status.didJustFinish) {
      ended.current = false;
      return;
    }
    if (ended.current) return;
    ended.current = true;
    if (repeat && now.current) {
      play(now.current);
    } else if (
      repeatAll ||
      queue.current.findIndex((song) => song.id === now.current?.id) <
        queue.current.length - 1
    ) {
      move(1);
    }
  }, [status.didJustFinish, repeat, repeatAll, move, player, play]);

  useEffect(() => {
    if (!current || status.isLoaded) return;
    const timer = setTimeout(
      () =>
        setError(
          "Âm thanh chưa tải được sau 15 giây. Kiểm tra URL, mạng hoặc CORS trên web.",
        ),
      15000,
    );
    return () => clearTimeout(timer);
  }, [current, status.isLoaded]);
  const toggle = useCallback(() => {
    if (!live.current || !now.current) return;
    const currentStatus = latest.current;
    const started = generation.current;
    try {
      if (currentStatus.playing) player.pause();
      else if (
        currentStatus.duration > 0 &&
        currentStatus.currentTime >= currentStatus.duration
      )
        player
          .seekTo(0)
          .then(() => {
            if (live.current && generation.current === started) player.play();
          })
          .catch((e) => {
            if (live.current && generation.current === started)
              setError(errorMessage(e));
          });
      else player.play();
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [player]);
  const seek = useCallback(
    async (time: number) => {
      if (!live.current) return;
      const started = generation.current;
      try {
        await player.seekTo(
          Math.max(
            0,
            Math.min(
              Number.isFinite(time) ? time : 0,
              latest.current.duration || 0,
            ),
          ),
        );
      } catch (e) {
        if (live.current && generation.current === started)
          setError(errorMessage(e));
      }
    },
    [player],
  );
  const next = useCallback(() => move(1), [move]);
  const previous = useCallback(() => move(-1), [move]);
  const removeSong = useCallback(
    (id: string) => {
      if (!live.current) return;
      queue.current = queue.current.filter((song) => song.id !== id);
      if (now.current?.id === id) {
        player.pause();
        now.current = null;
        generation.current++;
        setCurrent(null);
        setError("");
      }
    },
    [player],
  );
  const actions = useMemo(
    () => ({
      play,
      toggle,
      next,
      previous,
      seek,
      setRepeat,
      setRepeatAll,
      removeSong,
    }),
    [play, toggle, next, previous, seek, removeSong],
  );
  const loading = !!current && !status.isLoaded;
  const state = useMemo(
    () => ({
      current,
      playing: status.playing,
      loading,
      error,
      repeat,
      repeatAll,
    }),
    [current, status.playing, loading, error, repeat, repeatAll],
  );
  const progress = useMemo(
    () => ({
      position: status.currentTime || 0,
      duration: status.duration || 0,
    }),
    [status.currentTime, status.duration],
  );
  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>
        <ProgressContext.Provider value={progress}>
          {children}
        </ProgressContext.Provider>
      </StateContext.Provider>
    </ActionsContext.Provider>
  );
}
export function usePlayerActions() {
  const value = useContext(ActionsContext);
  if (!value) throw new Error("Thiếu PlayerProvider");
  return value;
}
export function usePlayerState() {
  const value = useContext(StateContext);
  if (!value) throw new Error("Thiếu PlayerProvider");
  return value;
}
export function usePlayerProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("Thiếu PlayerProvider");
  return value;
}
// Compatibility only. New consumers subscribe to the narrow hook they need.
export function usePlayer() {
  return { ...usePlayerActions(), ...usePlayerState(), ...usePlayerProgress() };
}
