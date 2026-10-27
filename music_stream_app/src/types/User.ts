export type UserRole = "user" | "admin";
export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  role: UserRole;
  createdAt?: string;
}
// TODO (phối hợp backend): role admin phải do backend/custom claims cấp, không tin role từ client.
