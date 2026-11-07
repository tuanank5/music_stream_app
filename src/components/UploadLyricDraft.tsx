import { useEffect, useRef, useState } from "react";
import { YStack } from "tamagui";
import { backendGet, backendPost } from "../services/backendService";
import { useAction } from "../hooks/useAction";
import { AppText, Button, ErrorText } from "./ui/index";
type Response = { text: string };
export default function UploadLyricDraft({
  prepareAudio,
  busy,
  onText,
  lyric,
  onBusy,
}: {
  prepareAudio: () => Promise<string>;
  busy: boolean;
  onText: (text: string) => void;
  lyric: string;
  onBusy?: (busy: boolean) => void;
}) {
  const live = useRef(true),
    latest = useRef({ lyric, onText });
  useEffect(() => {
    latest.current = { lyric, onText };
  }, [lyric, onText]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const action = useAction();
  useEffect(() => {
    onBusy?.(action.busy);
    return () => onBusy?.(false);
  }, [action.busy, onBusy]);
  const [draft, setDraft] = useState(""),
    [message, setMessage] = useState("");
  function accept(result: Response, before: string) {
    if (!live.current) return;
    setDraft(result.text);
    if (result.text) {
      if (latest.current.lyric !== before) {
        setMessage(
          "Bạn đã sửa lời trong lúc chờ. Chỉ bấm Điền bản nháp nếu muốn thay nội dung đang nhập.",
        );
        return;
      }
      latest.current.onText(result.text);
      setMessage(
        "Đã điền lời nháp vào ô Lời bài hát. Hãy kiểm tra trước khi Lưu.",
      );
    } else
      setMessage(
        "Không nhận được lời trong audio. Bạn có thể nhập lời thủ công.",
      );
  }
  return (
    <YStack gap="2">
      <Button
        title={
          action.busy ? "Đang tạo lời nháp…" : "Tạo lời nháp từ audio đã chọn"
        }
        variant="secondary"
        disabled={busy || action.busy}
        onPress={() =>
          void action.run(async () => {
            const before = latest.current.lyric;
            const config = await backendGet<{ enabled: boolean }>(
              "/audio-lyric-config",
            );
            if (!live.current) return;
            if (!config.enabled)
              throw new Error(
                "Tạo lời bằng AI chưa được bật. Bạn vẫn có thể nhập lời thủ công.",
              );
            const id = await prepareAudio();
            if (!live.current) return;
            accept(
              await backendPost<Response>("/audio-lyric", {
                audioPublicId: id,
                consent: true,
              }),
              before,
            );
          })
        }
      />
      <ErrorText message={action.error} />
      {draft ? (
        <Button
          title="Điền bản nháp vào ô Lời bài hát"
          variant="secondary"
          disabled={busy || action.busy}
          onPress={() => latest.current.onText(draft)}
        />
      ) : null}
      {message ? <AppText variant="caption">{message}</AppText> : null}
    </YStack>
  );
}
