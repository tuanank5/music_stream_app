import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { YStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useCatalogData } from "../contexts/DataContext";
import { useAction } from "../hooks/useAction";
import { createAlbum, newSongId } from "../services/catalogService";
import { backendPost } from "../services/backendService";
import { getFirebaseAuth } from "../services/firebase";
import { PickedMedia, uploadMedia } from "../services/mediaUploadService";
import { GENRES, validateGenres } from "../utils/genres";
import { createRequestCache } from "../utils/createRequest";
import { ModalPanel } from "../components/ui/ModalPanel";
import { BackButton } from "../components/ui/BackButton";
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
} from "../components/ui/index";
const options: {
  value: boolean;
  title: string;
  note: string;
}[] = [
  {
    value: true,
    title: "Công khai",
    note: "Hiển thị trong tìm kiếm, Charts và đề xuất.",
  },
  {
    value: false,
    title: "Riêng tư",
    note: "Chỉ bạn được xem trong ứng dụng.",
  },
];
export default function UploadSongScreen() {
  const { user } = useAuth();
  const data = useCatalogData();
  const action = useAction();
  const albumRequest = useRef(createRequestCache(newSongId));
  const [audio, setAudio] = useState<PickedMedia | null>(null);
  const [image, setImage] = useState<PickedMedia | null>(null);
  const [title, setTitle] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [genreOpen, setGenreOpen] = useState(false);
  const [lyric, setLyric] = useState("");
  const [description, setDescription] = useState("");
  const [artists, setArtists] = useState(user?.displayName || "Music lover");
  const [albumId, setAlbumId] = useState("");
  const [newAlbum, setNewAlbum] = useState("");
  const [isPublic, setPublic] = useState(true);
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
    requestId?: string;
    audioPublicId?: string;
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
    cache.current.requestId = undefined;
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
    const sessionUser = getFirebaseAuth().currentUser;
    const checkSession = () => {
      if (
        !sessionUser ||
        sessionUser.uid !== user?.uid ||
        getFirebaseAuth().currentUser !== sessionUser
      )
        throw new Error("Phiên đăng nhập đã thay đổi.");
    };
    checkSession();
    if (!user || !audio) {
      throw new Error("Đăng nhập và chọn file âm thanh trước.");
    }
    if (!title.trim()) {
      throw new Error("Nhập tên bài hát.");
    }
    const artistNames = artists
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    if (
      !artistNames.length ||
      artistNames.length > 10 ||
      artistNames.some((name) => name.length > 80)
    ) {
      throw new Error("Nhập từ 1 đến 10 tên nghệ sĩ, mỗi tên tối đa 80 ký tự.");
    }
    const selectedGenres = validateGenres(genres);
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
      saved.audioPublicId = uploaded.publicId;
      checkSession();
    }
    if (image && saved.imageUri !== image.uri) {
      saved.coverUrl = (await uploadMedia(image, "image")).url;
      saved.imageUri = image.uri;
      checkSession();
    }
    if (!saved.duration || saved.duration <= 0) {
      throw new Error("Máy chủ chưa trả về thời lượng âm thanh hợp lệ.");
    }
    let selectedAlbum = albumId;
    checkSession();
    if (newAlbum.trim()) {
      const key = newAlbum.trim();
      if (saved.albumKey !== key) {
        saved.albumId = await createAlbum(
          key,
          saved.coverUrl || "",
          albumRequest.current.key(user.uid, {
            title: key,
            coverUrl: saved.coverUrl || "",
          }),
        );
        checkSession();
        saved.albumKey = key;
      }
      selectedAlbum = saved.albumId!;
    }
    setMessage("Đang lưu bài hát...");
    saved.requestId ||= newSongId();
    checkSession();
    const result = await backendPost<{ id: string }>("/songs", {
      requestId: saved.requestId,
      title,
      artistNames,
      albumId: selectedAlbum,
      coverUrl: saved.coverUrl || "",
      audioPublicId: saved.audioPublicId || "",
      lyric,
      description,
      genre: selectedGenres,
      isPublic,
    });
    const id = result.id;
    saved.savedId = id;
    setMessage("Đã đăng tải bài hát.");
    router.replace({
      pathname: "/song",
      params: { id },
    });
  }
  return (
    <Page
      title="Đăng tải bài hát"
      titleLeading={
        <BackButton inline fallback="/library" disabled={action.busy} />
      }
      contentWidth="form"
      keyboardAvoiding
    >
      <SurfaceCard>
        <Button
          title={audio ? `Thay file: ${audio.name}` : "Chọn file âm thanh"}
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

      <Field label="Tên bài hát *" value={title} onChange={setTitle} />

      <Field
        label="Artist * (ngăn cách bằng dấu phẩy)"
        value={artists}
        onChange={setArtists}
      />

      <AppText>Genre *</AppText>
      <Button
        title={genres.length ? genres.join(", ") : "Chọn thể loại"}
        variant="secondary"
        disabled={action.busy}
        onPress={() => setGenreOpen(true)}
      />
      {genreOpen && (
        <ModalPanel
          open
          onClose={() => setGenreOpen(false)}
          title="Chọn thể loại"
          description={`${genres.length}/10 thể loại đã chọn`}
        >
          {GENRES.map((value) => {
            const selected = genres.includes(value);
            return (
              <Action
                key={value}
                role="checkbox"
                aria-checked={selected}
                disabled={!selected && genres.length >= 10}
                padding="3"
                flexDirection="row"
                alignItems="center"
                gap="3"
                onPress={() =>
                  setGenres((current) =>
                    current.includes(value)
                      ? current.filter((item) => item !== value)
                      : current.length < 10
                        ? [...current, value]
                        : current,
                  )
                }
              >
                <AppIcon name={selected ? "radio-on" : "radio-off"} />
                <AppText>{value}</AppText>
              </Action>
            );
          })}
        </ModalPanel>
      )}

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
        label="Mô tả"
        value={description}
        onChange={setDescription}
        multiline
      />

      <Field label="Lời bài hát" value={lyric} onChange={setLyric} multiline />

      <SectionTitle>Quyền riêng tư</SectionTitle>

      {options.map((option) => (
        <Action
          key={String(option.value)}
          role="radio"
          aria-checked={isPublic === option.value}
          disabled={action.busy}
          onPress={() => setPublic(option.value)}
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
            name={isPublic === option.value ? "radio-on" : "radio-off"}
            color={isPublic === option.value ? "focusRing" : "textMuted"}
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
        title={action.busy ? "Đang lưu..." : "Lưu"}
        disabled={action.busy}
        onPress={() => void action.run(save)}
      />
    </Page>
  );
}
