/** Server-only REST adapter. Provider tokens never enter room snapshots or logs. */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  fetch?: typeof globalThis.fetch;
}
export class ProviderError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface ProviderUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}
export interface ProviderAuth {
  access_token?: string;
  expires_in?: number;
  user?: ProviderUser;
}
export interface StoredProfile {
  id: string;
  display_name: string;
  avatar: string;
}
export function supabase(config: SupabaseConfig) {
  const url = config.url.replace(/\/$/, "");
  async function request<T>(
    path: string,
    method: string,
    value?: unknown,
    accessToken?: string,
    admin = false,
  ): Promise<T> {
    const key = admin ? config.serviceRoleKey : config.anonKey;
    if (!key)
      throw new ProviderError(503, "This account operation is not configured.");
    let response: Response;
    try {
      response = await (config.fetch ?? globalThis.fetch)(url + path, {
        method,
        headers: {
          apikey: key,
          Authorization: `Bearer ${accessToken ?? key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        ...(value === undefined ? {} : { body: JSON.stringify(value) }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new ProviderError(
        503,
        "The account service is temporarily unavailable.",
      );
    }
    if (!response.ok)
      throw new ProviderError(
        response.status === 401 || response.status === 403
          ? 401
          : response.status >= 500
            ? 503
            : 400,
        response.status === 401 || response.status === 403
          ? "Account authorization failed. Please sign in again."
          : "The account service could not complete this request. Check your details or try later.",
      );
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    try {
      return text ? (JSON.parse(text) as T) : (undefined as T);
    } catch {
      throw new ProviderError(
        503,
        "The account service returned an invalid response.",
      );
    }
  }
  return {
    signup: (email: string, password: string, name: string) =>
      request<ProviderAuth>("/auth/v1/signup", "POST", {
        email,
        password,
        data: { display_name: name, age_confirmed: true },
      }),
    login: (email: string, password: string) =>
      request<ProviderAuth>("/auth/v1/token?grant_type=password", "POST", {
        email,
        password,
      }),
    user: async (access: string) => {
      const user = await request<ProviderUser>(
        "/auth/v1/user",
        "GET",
        undefined,
        access,
      );
      if (
        !user ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          user.id,
        )
      )
        throw new ProviderError(401, "Invalid account identity.");
      return user;
    },
    recover: (email: string) =>
      request<unknown>("/auth/v1/recover", "POST", { email }),
    reset: (access: string, password: string) =>
      request<unknown>("/auth/v1/user", "PUT", { password }, access),
    logout: (access: string) =>
      request<unknown>("/auth/v1/logout", "POST", {}, access),
    profile: async (access: string, id: string) => {
      const profiles = await request<StoredProfile[]>(
        `/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,display_name,avatar`,
        "GET",
        undefined,
        access,
      );
      const profile = profiles?.[0];
      if (!profile || profile.id !== id)
        throw new ProviderError(
          503,
          "Your account profile is unavailable. The database migration may be missing.",
        );
      return profile;
    },
    updateProfile: async (
      access: string,
      id: string,
      name: string,
      avatar: string,
    ) => {
      const profiles = await request<StoredProfile[]>(
        `/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,display_name,avatar`,
        "PATCH",
        { display_name: name, avatar },
        access,
      );
      const profile = profiles?.[0];
      if (!profile || profile.id !== id)
        throw new ProviderError(
          503,
          "Your account profile could not be updated.",
        );
      return profile;
    },
    deleteUser: (id: string) =>
      request<unknown>(
        `/auth/v1/admin/users/${encodeURIComponent(id)}`,
        "DELETE",
        undefined,
        config.serviceRoleKey,
        true,
      ),
  };
}
