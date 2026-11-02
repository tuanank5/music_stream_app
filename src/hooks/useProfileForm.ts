import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { saveProfile } from "../services/authService";
import { notify } from "../utils/feedback";
import { useAction } from "./useAction";

export function useProfileForm() {
  const auth = useAuth();
  const action = useAction();
  const [name, setName] = useState(auth.user?.displayName ?? "");
  const [photo, setPhoto] = useState(auth.user?.photoURL ?? "");
  return {
    user: auth.user,
    isAdmin: auth.isAdmin,
    name,
    setName,
    photo,
    setPhoto,
    busy: action.busy,
    error: action.error,
    save: () =>
      action.run(async () => {
        await saveProfile(name, photo);
        await auth.refresh();
        notify("Đã lưu hồ sơ.");
      }),
    refresh: () => action.run(auth.refresh),
    logout: () => action.run(auth.logout),
  };
}
