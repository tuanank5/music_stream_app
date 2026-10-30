import {
  collection,
  limit,
  onSnapshot,
  query,
} from "firebase/firestore";

import { getFirebaseDb } from "./firebase";
import type { MusicChart } from "../types/discovery";

export function watchCharts(
  next: (charts: MusicChart[]) => void,
  fail: (error: Error) => void,
) {
  const chartsQuery = query(
    collection(getFirebaseDb(), "charts"),
    limit(50),
  );

  return onSnapshot(
    chartsQuery,
    (snapshot) => {
      const charts = snapshot.docs
        .map((document): MusicChart => {
          const data = document.data();

          return {
            id: document.id,
            title: String(data.title ?? ""),
            subtitle: String(data.subtitle ?? ""),
            description: String(data.description ?? ""),
            coverUrl: String(data.coverUrl ?? ""),

            theme:
              data.theme === "cyan" || data.theme === "pink"
                ? data.theme
                : "violet",

            songIds: Array.isArray(data.songIds)
              ? data.songIds.filter(
                  (id: unknown): id is string =>
                    typeof id === "string",
                )
              : [],

            active: data.active === true,

            order: Number.isFinite(data.order)
              ? data.order
              : 0,
          };
        })
        .filter((chart) => chart.active)
        .sort(
          (a, b) =>
            a.order - b.order ||
            a.title.localeCompare(b.title),
        );

      next(charts);
    },
    fail,
  );
}