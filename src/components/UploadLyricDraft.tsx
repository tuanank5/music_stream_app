import { useEffect, useRef, useState } from "react";
import { YStack } from "tamagui";
import { backendGet, backendPost } from "../services/backendService";
import { useAction } from "../hooks/useAction";
import { AppText, Button, ErrorText } from "./ui/index";
export type UploadLyricJob = {
  status: string;
  text: string;
  error: string;
  draftId: string;
};
type Response = { enabled: boolean; job: UploadLyricJob | null };
export default function UploadLyricDraft({
  prepareAudio,
  busy,
  onText,
  lyric,
}: {
  prepareAudio: () => Promise<string>;
  busy: boolean;
  onText: (text: string) => void;
  lyric: string;
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
  const [publicId, setPublicId] = useState(""),
    [job, setJob] = useState<UploadLyricJob | null>(null),
    [message, setMessage] = useState("");
  function accept(result: Response, before: string) {
    if (!live.current) return;
    setJob(result.job);
    if (result.job?.status === "completed") {
      if (result.job.text) {
        if (latest.current.lyric !== before) {
          setMessage(
            "Bạn đã sửa lời trong lúc chờ. Chỉ bấm Điền bản nháp nếu muốn thay nội dung đang nhập.",
          );
          return;
        }
        latest.current.onText(result.job.text);
        setMessage(
          "Đã điền lời nháp vào ô Lời bài hát. Hãy kiểm tra trước khi Lưu.",
        );
      } else
        setMessage(
          "Không nhận được lời trong audio. Bạn có thể nhập lời thủ công.",
        );
    }
  }
  return (
    <YStack gap="2">
      <AppText variant="caption">
        Tùy chọn: gửi audio đã chọn tới Gemini để tạo lời nháp. Lời nháp sẽ điền
        vào ô bên dưới; bạn sửa trước khi đăng. Audio tối đa 5 phút.
      </AppText>
      <Button
        title={
          job?.status === "processing"
            ? "Đang tạo lời nháp…"
            : "Tạo lời nháp từ audio đã chọn"
        }
        variant="secondary"
        disabled={busy || action.busy || job?.status === "processing"}
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
            setPublicId(id);
            accept(
              await backendPost<Response>("/audio-lyric-job", {
                audioPublicId: id,
                consent: true,
              }),
              before,
            );
          })
        }
      />
      {publicId ? (
        <Button
          title="Kiểm tra và điền lời nháp"
          variant="secondary"
          disabled={busy || action.busy}
          onPress={() =>
            void action.run(async () => {
              const before = latest.current.lyric;
              return accept(
                await backendGet<Response>("/audio-lyric-job", { publicId }),
                before,
              );
            })
          }
        />
      ) : null}
      <ErrorText message={action.error || job?.error || ""} />
      {job?.status === "completed" && job.text ? (
        <Button
          title="Điền bản nháp vào ô Lời bài hát"
          variant="secondary"
          disabled={busy || action.busy}
          onPress={() => latest.current.onText(job.text)}
        />
      ) : null}
      {message ? <AppText variant="caption">{message}</AppText> : null}
    </YStack>
  );
}
