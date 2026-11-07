export interface AccountSession {
  token: string;
  name: string;
  player?: { id: string; name: string; kind?: string; avatar?: string };
  expiresAt?: number;
}
export interface Features {
  accounts: boolean;
  accountDeletion: boolean;
  admin?: boolean;
}
export async function request<T>(
  path: string,
  token?: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = (await response.json()) as T & { error?: string };
  if (response.status === 401 && token)
    window.dispatchEvent(new Event("playnex-session-expired"));
  if (!response.ok)
    throw new Error(
      data.error || `Request failed (${response.status}). Please try again.`,
    );
  return data;
}
export function accountSession(data: {
  token: string;
  player: { id: string; name: string; kind?: string };
  expiresAt?: number;
}): AccountSession {
  return { ...data, name: data.player.name };
}
