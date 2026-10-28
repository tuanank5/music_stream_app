export function cleanText(
  value: string,
  label: string,
  max: number,
  required = true,
): string {
  const text = value.trim();
  if (required && !text) throw new Error(`Vui lòng nhập ${label}.`);
  if (text.length > max)
    throw new Error(`${label} không được vượt quá ${max} ký tự.`);
  return text;
}
export function httpsUrl(
  value: string,
  label: string,
  required = false,
): string {
  const text = cleanText(value, label, 2048, required);
  if (!text) return "";
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || !url.hostname) throw new Error();
  } catch {
    throw new Error(
      `${label} phải là URL HTTPS hợp lệ, không phải đường dẫn D:\\...`,
    );
  }
  return text;
}
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
export function formatDuration(seconds: number): string {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function validateRegister(
  name: string,
  email: string,
  password: string,
  confirm: string,
) {
  const displayName = cleanText(name, "tên hiển thị", 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    throw new Error("Email chưa hợp lệ.");
  if (password.length < 8) throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");
  if (password !== confirm) throw new Error("Hai mật khẩu không khớp.");
  return { displayName, email: email.trim() };
}
