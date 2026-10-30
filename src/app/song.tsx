// import React from "react";
// import Guard from "../components/Guard";
// import { SongDetailScreen } from "../components/DetailScreens";
// export default function Route() {
//   return (
//     <Guard>
//       <SongDetailScreen />
//     </Guard>
//   );
// }

import React, { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";

import Guard from "../components/Guard";
import { SongDetailScreen } from "../components/DetailScreens";
import { useData } from "../contexts/DataContext";

import {
  ErrorText,
  Page,
  Loading,
} from "../components/UI";

import { errorMessage } from "../utils/feedback";

function SongGate({ id }: { id: string }) {
  const { ensureSong } = useData();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;

    ensureSong(id)
      .catch(e => {
        if (live) {
          setError(errorMessage(e));
        }
      })
      .finally(() => {
        if (live) {
          setLoading(false);
        }
      });

    return () => {
      live = false;
    };
  }, [id, ensureSong]);

  if (loading) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <ErrorText message={error} />
      </Page>
    );
  }

  return <SongDetailScreen />;
}

export default function Route() {
  const params = useLocalSearchParams<{
    id: string | string[];
  }>();

  const id = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  return (
    <Guard>
      {id ? (
        <SongGate key={id} id={id} />
      ) : (
        <Page>
          <ErrorText message="Thiếu ID bài hát." />
        </Page>
      )}
    </Guard>
  );
}