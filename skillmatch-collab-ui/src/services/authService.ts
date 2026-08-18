import { request, unwrap } from "./apiClient";
import { toUser } from "./mappers";
import type { AuthCredentials, RegisterPayload, User } from "./types";

export const authService = {
  /** POST /api/auth/login then GET /api/auth/me */
  async login(payload: AuthCredentials): Promise<{ user: User }> {
    await request({
      path: "/api/auth/login",
      method: "POST",
      body: { email: payload.email, password: payload.password },
    });
    return { user: await authService.me() };
  },

  /** POST /api/auth/register then GET /api/auth/me */
  async register(payload: RegisterPayload): Promise<{ user: User }> {
    await request({
      path: "/api/auth/register",
      method: "POST",
      body: {
        name: payload.fullName,
        email: payload.email,
        password: payload.password,
        confirm_password: payload.confirmPassword,
      },
    });
    return { user: await authService.me() };
  },

  /** GET /api/auth/me — the logged-in user from the Flask session cookie. */
  async me(): Promise<User> {
    const payload = await request<unknown>({ path: "/api/auth/me" });
    return toUser(unwrap(payload, "user"));
  },

  /** Same as me(), but never redirects on 401 — for optional session checks. */
  async currentUserOrNull(): Promise<User | null> {
    try {
      const payload = await request<unknown>({ path: "/api/auth/me", silent401: true });
      return toUser(unwrap(payload, "user"));
    } catch {
      return null;
    }
  },

  /** POST /api/auth/logout */
  async logout(): Promise<void> {
    await request({ path: "/api/auth/logout", method: "POST", silent401: true }).catch(() => undefined);
  },
};

