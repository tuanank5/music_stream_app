import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { YStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useCatalogData } from "../contexts/DataContext";
import { useAction } from "../hooks/useAction";
import { createAlbum, saveSong } from "../services/catalogService";
import { PickedMedia, uploadMedia } from "../services/mediaUploadService";
import { Visibility } from "../types/domain";
import { BackButton } from "./discovery/BackButton";
import {
  Action,
  AppImage,
  AppIcon,
  AppText,
  Button,
  ErrorText,
  Field,
  Page,
  SectionTitle,
  SurfaceCard,
} from "./UI";
const options: {
  value: Visibility;
  title: string;
  note: string;
}[] = [
  {
    value: "public",
    title: "Public",
    note: "Hiển thị trong tìm kiếm, Charts và đề xuất.",
  },
  {
    value: "unlisted",
    title: "Unlisted",
    note: "Không hiện trong danh mục; người đăng nhập có link có thể xem.",
  },
  {
    value: "private",
    title: "Private",
    note: "Chỉ bạn được xem trong ứng dụng.",
  },
  {
    value: "followers",
    title: "Follower Exclusive",
    note: "Chỉ bạn và người đang theo dõi bạn được xem.",
  },
];
export default function UploadSongScreen() {
  const { user } = useAuth();
  const data = useCatalogData();
  const action = useAction();
  const [audio, setAudio] = useState<PickedMedia | null>(null);
  const [image, setImage] = useState<PickedMedia | null>(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Pop");
  const [lyric, setLyric] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [newAlbum, setNewAlbum] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [message, setMessage] = useState("");
  const cache = useRef<{
    audioUri?: string;
    audioUrl?: string;
    duration?: number;
    imageUri?: string;
    coverUrl?: string;
    albumKey?: string;
    albumId?: string;
    savedId?: string;
  }>({});
  async function pickAudio() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
      multiple: false,
      base64: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setAudio({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || "audio/mpeg",
      size: asset.size,
      file: asset.file,
    });
    cache.current.savedId = undefined;
    if (!title) {
      setTitle(asset.name.replace(/\.[^.]+$/, ""));
    }
  }
  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setImage({
      uri: asset.uri,
      name: asset.fileName || "cover.jpg",
      mimeType: asset.mimeType || "image/jpeg",
      size: asset.fileSize,
      file: asset.file,
    });
  }
  async function save() {
    if (!user || !audio) {
      throw new Error("Đăng nhập và chọn file âm thanh trước.");
    }
    if (!title.trim()) {
      throw new Error("Nhập tên bài hát.");
    }
    const genres = [
      ...new Set(
        genre
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    if (
      !genres.length ||
      genres.length > 10 ||
      genres.some((value) => value.length > 50)
    ) {
      throw new Error("Nhập 1–10 genre, mỗi genre tối đa 50 ký tự.");
    }
    const saved = cache.current;
    if (saved.savedId) {
      router.replace({
        pathname: "/song",
        params: { id: saved.savedId },
      });
      return;
    }
    setMessage("Đang tải file...");
    if (saved.audioUri !== audio.uri) {
      const uploaded = await uploadMedia(audio, "video");
      saved.audioUri = audio.uri;
      saved.audioUrl = uploaded.url;
      saved.duration = uploaded.duration;
    }
    if (image && saved.imageUri !== image.uri) {
      saved.coverUrl = (await uploadMedia(image, "image")).url;
      saved.imageUri = image.uri;
    }
    if (!saved.duration || saved.duration <= 0) {
      throw new Error("Cloudinary chưa trả về thời lượng âm thanh hợp lệ.");
    }
    let selectedAlbum = albumId;
    if (newAlbum.trim()) {
      const key = newAlbum.trim();
      if (saved.albumKey !== key) {
        saved.albumId = await createAlbum(key, saved.coverUrl || "");
        saved.albumKey = key;
      }
      selectedAlbum = saved.albumId!;
    }
    setMessage("Đang lưu bài hát...");
    const id = await saveSong(null, {
      title,
      artist: user.displayName || "Music lover",
      artistId: user.uid,
      albumId: selectedAlbum,
      album:
        newAlbum.trim() ||
        data.albums.find((a) => a.id === albumId)?.title ||
        "",
      coverUrl: saved.coverUrl || "",
      audioUrl: saved.audioUrl!,
      audioKey: "",
      durationSeconds: saved.duration,
      lyrics: lyric,
      description,
      tags: tags
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 20),
      genre: genres,
      visibility,
      active: true,
    });
    saved.savedId = id;
    setMessage("Đã đăng tải bài hát.");
    router.replace({
      pathname: "/song",
      params: { id },
    });
  }
  return (
    <Page
      title="Đăng bài hát"
      titleLeading={
        <BackButton inline fallback="/library" disabled={action.busy} />
      }
      contentWidth="form"
      keyboardAvoiding
    >
      <SurfaceCard>
        <Button
          title={audio ? `Replace file: ${audio.name}` : "Chọn file âm thanh"}
          disabled={action.busy}
          onPress={() => void action.run(pickAudio)}
        />

        {image ? (
          <AppImage
            source={{ uri: image.uri }}
            width={150}
            height={150}
            borderRadius={12}
            alignSelf="center"
          />
        ) : null}

        <Button
          title="Chọn ảnh bìa từ album ảnh"
          variant="secondary"
          disabled={action.busy}
          onPress={() => void action.run(pickImage)}
        />
      </SurfaceCard>

      <Field label="Title *" value={title} onChange={setTitle} />

      <AppText variant="muted">
        Artist: {user?.displayName || "Music lover"}
      </AppText>

      <Field
        label="Genre * (ngăn cách bằng dấu phẩy)"
        value={genre}
        onChange={setGenre}
      />

      <SectionTitle>Album</SectionTitle>

      <Button
        title="Không thuộc album"
        variant="secondary"
        onPress={() => {
          setAlbumId("");
          setNewAlbum("");
        }}
      />

      {data.albums
        .filter((album) => album.artistId === user?.uid)
        .map((album) => (
          <Button
            key={album.id}
            title={`${albumId === album.id ? "✓ " : ""}${album.title}`}
            variant="secondary"
            onPress={() => {
              setAlbumId(album.id);
              setNewAlbum("");
            }}
          />
        ))}

      <Field
        label="Hoặc tạo album mới"
        value={newAlbum}
        onChange={setNewAlbum}
      />

      <Field
        label="Tags (ngăn cách bằng dấu phẩy)"
        value={tags}
        onChange={setTags}
      />

      <Field
        label="Description"
        value={description}
        onChange={setDescription}
        multiline
      />

      <Field label="Lời bài hát" value={lyric} onChange={setLyric} multiline />

      <SectionTitle>Privacy</SectionTitle>

      {options.map((option) => (
        <Action
          key={option.value}
          role="radio"
          aria-checked={visibility === option.value}
          disabled={action.busy}
          onPress={() => setVisibility(option.value)}
          backgroundColor="surface"
          padding="4"
          borderRadius={14}
          marginVertical="2"
          flexDirection="row"
          gap="3"
          alignItems="center"
        >
          <YStack flex={1} minWidth={0}>
            <AppText fontSize={18} lineHeight="26px" fontWeight="700">
              {option.title}
            </AppText>

            <AppText variant="muted">{option.note}</AppText>
          </YStack>

          <AppIcon
            name={visibility === option.value ? "radio-on" : "radio-off"}
            color={visibility === option.value ? "focusRing" : "textMuted"}
            size={24}
          />
        </Action>
      ))}

      <AppText variant="caption">
        Privacy giới hạn quyền đọc dữ liệu trong ứng dụng. URL Cloudinary thông
        thường vẫn mở được nếu bị chia sẻ ra ngoài.
      </AppText>

      <ErrorText message={action.error} />

      <AppText variant="muted">{message}</AppText>

      <Button
        title={action.busy ? "Đang lưu..." : "Save"}
        disabled={action.busy}
        onPress={() => void action.run(save)}
      />
    </Page>
  );
}
