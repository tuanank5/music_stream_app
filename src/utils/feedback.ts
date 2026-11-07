import { Alert, Platform } from "react-native";
const messages: Record<string, string> = {
  "auth/user-disabled": "Tài khoản của bạn đã bị vô hiệu hóa.",
  "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
  "auth/email-already-in-use": "Email đã được đăng ký.",
  "auth/invalid-email": "Email không hợp lệ.",
  "auth/weak-password": "Mật khẩu chưa đủ mạnh.",
  "auth/operation-not-allowed": "Bật Email/Password trên Firebase Console.",
  "auth/configuration-not-found":
    "Chưa khởi tạo Authentication hoặc config sai project.",
  "auth/too-many-requests": "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
  "permission-denied":
    "Không đủ quyền. Kiểm tra đăng nhập, custom claim và Firestore Rules.",
  unavailable: "Không thể kết nối Firebase. Hãy kiểm tra mạng.",
};
export function errorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string };
  return messages[e?.code ?? ""] ?? e?.message ?? "Thao tác thất bại.";
}
export function notify(message: string) {
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert("Thông báo", message);
}
export function confirmDelete(
  message: string,
  action: () => void,
  title = "Xác nhận",
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) action();
  } else
    Alert.alert(title, message, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: action },
    ]);
}
