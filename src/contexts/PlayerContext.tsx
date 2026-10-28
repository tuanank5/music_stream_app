import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
const demos: Record<string, number> = {
  demo1: require("../../assets/audio/demo1.mp3"),
  demo2: require("../../assets/audio/demo2.mp3"),
  demo3: require("../../assets/audio/demo3.mp3"),
};
type Value = {
  current: Song | null;
  playing: boolean;
  position: number;
  duration: number;
  loading: boolean;
  error: string;
  repeat: boolean;
  setRepeat: (v: boolean) => void;
  play: (s: Song, queue?: Song[]) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => Promise<void>;
};
const Context = createContext<Value | null>(null);
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <PlayerSession key={user?.uid ?? "guest"}>{children}</PlayerSession>;
}
function PlayerSession({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [current, setCurrent] = useState<Song | null>(null),
    [error, setError] = useState(""),
    [repeat, setRepeat] = useState(false);
  const queue = useRef<Song[]>([]);
  const now = useRef<Song | null>(null);
  const ended = useRef(false);
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((e) =>
      setError(errorMessage(e)),
    );
  }, []);
  const play = useCallback(
    (song: Song, list?: Song[]) => {
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
        setCurrent(song);
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
    if (repeat)
      player
        .seekTo(0)
        .then(() => player.play())
        .catch((e) => setError(errorMessage(e)));
    else if (queue.current.length > 1) move(1);
  }, [status.didJustFinish, repeat, move, player]);
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
  function toggle() {
    if (!current) return;
    try {
      if (status.playing) player.pause();
      else if (status.duration > 0 && status.currentTime >= status.duration)
        player
          .seekTo(0)
          .then(() => player.play())
          .catch((e) => setError(errorMessage(e)));
      else player.play();
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function seek(time: number) {
    try {
      await player.seekTo(Math.max(0, Math.min(time, status.duration || 0)));
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <Context.Provider
      value={{
        current,
        playing: status.playing,
        position: status.currentTime || 0,
        duration: status.duration || 0,
        loading: !!current && !status.isLoaded,
        error,
        repeat,
        setRepeat,
        play,
        toggle,
        next: () => move(1),
        previous: () => move(-1),
        seek,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePlayer() {
  const c = useContext(Context);
  if (!c) throw new Error("Thiếu PlayerProvider");
  return c;
}
