import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { uploadMedia } from "../services/mediaUploadService";
import { getFirebaseAuth } from "../services/firebase";
import { backendPatch } from "../services/backendService";
import { useBackendResource } from "./useBackendResource";
import { useAuth } from "../contexts/AuthContext";
import { notify } from "../utils/feedback";
import { useAction } from "./useAction";

export function useProfileForm() {
  const auth = useAuth();
  const action = useAction();
  const uid = auth.user?.uid;
  const [draft, setDraft] = useState<{
    uid?: string;
    name?: string;
    photo?: string;
    biography?: string;
  }>({ uid });
  const edit = (field: "name" | "photo" | "biography", value: string) =>
    setDraft((previous) => ({
      ...(previous.uid === uid ? previous : {}),
      uid,
      [field]: value,
    }));
  const profile = useBackendResource<{
    displayName: string;
    avatarUrl: string;
    biography: string;
    followerCount: number;
    followingCount: number;
  }>("/me");
  const currentDraft = draft.uid === uid ? draft : {};
  const name = currentDraft.name ?? profile.value?.displayName ?? "";
  const photo = currentDraft.photo ?? profile.value?.avatarUrl ?? "";
  const biography = currentDraft.biography ?? profile.value?.biography ?? "";
  return {
    user: auth.user,
    name,
    setName: (value: string) => edit("name", value),
    photo,
    setPhoto: (value: string) => edit("photo", value),
    biography,
    setBiography: (value: string) => edit("biography", value),
    followerCount: profile.value?.followerCount ?? 0,
    followingCount: profile.value?.followingCount ?? 0,
    busy: action.busy || profile.loading,
    error: action.error || profile.error,
    save: () =>
      action.run(async () => {
        await backendPatch("/me", {
          displayName: name,
          avatarUrl: photo,
          biography,
        });
        notify("Đã lưu hồ sơ.");
      }),
    pickAvatar: () =>
      action.run(async () => {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error("Cần đăng nhập.");
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
        if (result.canceled) return;
        if (getFirebaseAuth().currentUser !== user)
          throw new Error("Phiên đăng nhập đã thay đổi.");
        const asset = result.assets[0];
        const uploaded = await uploadMedia(
          {
            uri: asset.uri,
            name: asset.fileName || "avatar.jpg",
            mimeType: asset.mimeType || "image/jpeg",
            size: asset.fileSize,
            file: asset.file,
          },
          "image",
        );
        if (getFirebaseAuth().currentUser !== user)
          throw new Error("Phiên đăng nhập đã thay đổi.");
        edit("photo", uploaded.url);
        await backendPatch("/me", {
          displayName: name,
          avatarUrl: uploaded.url,
          biography,
        });
        notify("Đã lưu ảnh đại diện.");
      }),
    refresh: () => action.run(auth.refresh),
    logout: () => action.run(auth.logout),
  };
}
