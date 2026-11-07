import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  backendDelete,
  backendGet,
  backendPut,
} from "../services/backendService";
import { getFirebaseAuth } from "../services/firebase";
import type { Album } from "../types/domain";
import { errorMessage } from "../utils/feedback";

const Context = createContext<{
  albums: Album[];
  loading: boolean;
  ready: boolean;
  error: string;
  pending: Set<string>;
  toggle: (id: string) => Promise<void>;
  reload: () => void;
} | null>(null);
export function AlbumFavoritesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  return (
    <Session key={user?.uid || "guest"} uid={user?.uid}>
      {children}
    </Session>
  );
}
function Session({
  uid,
  children,
}: {
  uid?: string;
  children: React.ReactNode;
}) {
  const [albums, setAlbums] = useState<Album[]>([]),
    [loading, setLoading] = useState(!!uid);
  const [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(!uid);
  const mutationVersion = useRef(0);
  const [pending, setPending] = useState(new Set<string>());
  const locks = useRef(new Set<string>()),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    if (!uid) return;
    let current = true;
    const version = mutationVersion.current;
    backendGet<{ albums: Album[] }>("/favorite-albums")
      .then((value) => {
        if (
          current &&
          version === mutationVersion.current &&
          !locks.current.size
        ) {
          setAlbums(value.albums);
          setReady(true);
          setError("");
        }
      })
      .catch((failure) => {
        if (current) setError(errorMessage(failure));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [uid, revision]);
  const toggle = async (id: string) => {
    if (
      !uid ||
      !live.current ||
      getFirebaseAuth().currentUser?.uid !== uid ||
      !ready ||
      locks.current.has(id)
    )
      return;
    locks.current.add(id);
    mutationVersion.current++;
    setPending(new Set(locks.current));
    setError("");
    try {
      if (albums.some((album) => album.id === id)) {
        await backendDelete(`/favorite-albums/${encodeURIComponent(id)}`);
        if (live.current)
          setAlbums((current) => current.filter((album) => album.id !== id));
      } else {
        const result = await backendPut<{ album: Album }>(
          `/favorite-albums/${encodeURIComponent(id)}`,
        );
        if (live.current)
          setAlbums((current) => [
            ...current.filter((album) => album.id !== id),
            result.album,
          ]);
      }
    } catch (failure) {
      if (live.current) setError(errorMessage(failure));
    } finally {
      mutationVersion.current++;
      locks.current.delete(id);
      if (live.current) setPending(new Set(locks.current));
    }
  };
  const reload = useCallback(() => {
    setLoading(true);
    setRevision((value) => value + 1);
  }, []);
  return (
    <Context.Provider
      value={{
        albums,
        loading,
        ready,
        error,
        pending,
        toggle,
        reload,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAlbumFavorites() {
  const context = useContext(Context);
  if (!context) throw new Error("Thiếu AlbumFavoritesProvider");
  return context;
}
