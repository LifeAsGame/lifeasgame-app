export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
  role: "user" | "admin";
}
