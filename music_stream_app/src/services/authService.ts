// TODO (phối hợp Firebase): implement email/password + Google sign-in after firebase config is reviewed.
// Không giả lập đăng nhập thành công ở service này.
import { AppUser } from "../types/User";
export async function getCurrentUser(): Promise<AppUser | null> {
  // Chưa kết nối Firebase Authentication.
  return null;
}
