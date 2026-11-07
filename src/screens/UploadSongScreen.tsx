import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Platform } from "react-native";
import { XStack, YStack } from "tamagui";
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
import UploadLyricDraft from "../components/UploadLyricDraft";
import {
  Action,
  AppImage,
  AppIcon,
  AppText,
  Button,
  ErrorText,
  Field,
  IconButton,
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
  const [audioSelection, setAudioSelection] = useState(0);
  const [image, setImage] = useState<PickedMedia | null>(null);
  const [title, setTitle] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [genreOpen, setGenreOpen] = useState(false);
  const [lyric, setLyric] = useState("");
  const [description, setDescription] = useState("");
  const [artists, setArtists] = useState(user?.displayName || "Music lover");
  const [albumId, setAlbumId] = useState("");
  const [newAlbum, setNewAlbum] = useState("");
  const [newAlbumOpen, setNewAlbumOpen] = useState(false);
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
      // On Android retain the system-granted content URI; the upload service
      // stages it in FileSystem.Paths.cache instead of the picker's shared cache.
      copyToCacheDirectory: Platform.OS !== "android",
      multiple: false,
      base64: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setAudioSelection((value) => value + 1);
    cache.current.audioUri = undefined;
    cache.current.audioPublicId = undefined;
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
  async function prepareLyricAudio() {
    const owner = getFirebaseAuth().currentUser;
    if (!owner || !audio)
      throw new Error("Chọn audio và đăng nhập trước khi tạo lời.");
    let publicId = "";
    const ok = await action.run(async () => {
      const saved = cache.current;
      if (saved.audioUri !== audio.uri || !saved.audioPublicId) {
        const uploaded = await uploadMedia(audio, "video");
        if (getFirebaseAuth().currentUser !== owner)
          throw new Error("Phiên đăng nhập đã thay đổi.");
        saved.audioUri = audio.uri;
        saved.audioUrl = uploaded.url;
        saved.duration = uploaded.duration;
        saved.audioPublicId = uploaded.publicId;
      }
      publicId = saved.audioPublicId!;
    });
    if (!ok) throw new Error("Chưa chuẩn bị được audio để tạo lời nháp.");
    return publicId;
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
          title="Chọn ảnh bìa từ Album ảnh"
          variant="secondary"
          disabled={action.busy}
          onPress={() => void action.run(pickImage)}
        />
      </SurfaceCard>

      <Field
        label="Tên bài hát *"
        value={title}
        onChange={setTitle}
        disabled={action.busy}
      />

      <Field
        label="Artist * (ngăn cách bằng dấu phẩy)"
        value={artists}
        onChange={setArtists}
        disabled={action.busy}
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
                disabled={action.busy || (!selected && genres.length >= 10)}
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

      <XStack alignItems="center" justifyContent="space-between" marginTop="2">
        <SectionTitle>Album</SectionTitle>
        <IconButton
          aria-label={newAlbumOpen ? "Đóng tạo Album mới" : "Tạo Album mới"}
          disabled={action.busy}
          onPress={() => {
            setNewAlbumOpen((open) => !open);
            setAlbumId("");
            if (newAlbumOpen) setNewAlbum("");
          }}
        >
          <AppIcon name={newAlbumOpen ? "close" : "add"} />
        </IconButton>
      </XStack>

      <YStack gap="1">
        <Action
          role="radio"
          aria-checked={!albumId && !newAlbumOpen}
          disabled={action.busy}
          onPress={() => {
            setAlbumId("");
            setNewAlbum("");
            setNewAlbumOpen(false);
          }}
          backgroundColor={!albumId && !newAlbumOpen ? "contrast" : "surface"}
          flexDirection="row"
          alignItems="center"
          borderRadius={12}
          borderWidth={1}
          borderColor={!albumId && !newAlbumOpen ? "contrast" : "borderColor"}
          padding="3"
        >
          <AppText
            flex={1}
            color={!albumId && !newAlbumOpen ? "white" : "color"}
          >
            Không thuộc album
          </AppText>
          <AppIcon
            name={!albumId && !newAlbumOpen ? "radio-on" : "radio-off"}
            color={!albumId && !newAlbumOpen ? "white" : "textMuted"}
          />
        </Action>
        {data.albums
          .filter((album) => album.artistId === user?.uid)
          .map((album) => {
            const selected = albumId === album.id;
            return (
              <Action
                key={album.id}
                role="radio"
                aria-checked={selected}
                disabled={action.busy}
                onPress={() => {
                  setAlbumId(album.id);
                  setNewAlbum("");
                  setNewAlbumOpen(false);
                }}
                backgroundColor={selected ? "contrast" : "surface"}
                flexDirection="row"
                alignItems="center"
                borderRadius={12}
                borderWidth={1}
                borderColor={selected ? "contrast" : "borderColor"}
                padding="3"
              >
                <AppText flex={1} color={selected ? "white" : "color"}>
                  {album.title}
                </AppText>
                <AppIcon
                  name={selected ? "radio-on" : "radio-off"}
                  color={selected ? "white" : "textMuted"}
                />
              </Action>
            );
          })}
        {newAlbumOpen ? (
          <Field
            label="Tên Album mới"
            value={newAlbum}
            onChange={setNewAlbum}
            disabled={action.busy}
          />
        ) : null}
      </YStack>

      <Field
        label="Mô tả"
        value={description}
        onChange={setDescription}
        multiline
        disabled={action.busy}
      />

      {audio ? (
        <UploadLyricDraft
          key={`${user?.uid}:${audioSelection}:${audio.uri}`}
          busy={action.busy}
          prepareAudio={prepareLyricAudio}
          onText={setLyric}
          lyric={lyric}
        />
      ) : null}
      <Field
        label="Lời bài hát"
        value={lyric}
        onChange={setLyric}
        multiline
        disabled={action.busy}
      />

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
