import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../../../../packages/ui/src";
import {
  accountSession,
  request,
  type AccountSession,
  type Features,
} from "./client";
type Mode = "login" | "signup" | "recover" | "reset";
export default function AccountPanel({
  session,
  onSession,
  onLogout,
  onName,
}: {
  session: AccountSession | null;
  onSession: (session: AccountSession) => void;
  onLogout: () => void;
  onName: (name: string) => void;
}) {
  const [features, setFeatures] = useState<Features | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [mode, setMode] = useState<Mode>("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(session?.name || ""),
    [avatar, setAvatar] = useState("orbit"),
    [adult, setAdult] = useState(false),
    [resetToken, setResetToken] = useState(""),
    [callbackToken, setCallbackToken] = useState(""),
    [deleteConfirmed, setDeleteConfirmed] = useState(false);
  useEffect(() => {
    let live = true;
    request<Features>("/features", session?.token)
      .then((v) => {
        if (live) setFeatures(v);
      })
      .catch((e) => {
        if (live) setError(String(e.message));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [session?.token]);
  useEffect(() => {
    const fragment = new URLSearchParams(location.hash.slice(1));
    const accessToken = fragment.get("access_token");
    if (accessToken && fragment.get("type") !== "recovery") {
      setCallbackToken(accessToken);
      history.replaceState(null, "", location.pathname + location.search);
    }
    if (accessToken && fragment.get("type") === "recovery") {
      setResetToken(accessToken);
      setMode("reset");
      history.replaceState(null, "", location.pathname + location.search);
    }
  }, []);
  useEffect(() => {
    let live = true;
    if (!session) return;
    request<{ profile: { name: string; avatar: string } }>(
      "/profile",
      session.token,
    )
      .then((data) => {
        if (live) {
          setName(data.profile.name);
          setAvatar(data.profile.avatar);
        }
      })
      .catch((e) => {
        if (live)
          setError(e instanceof Error ? e.message : "Could not load profile.");
      });
    return () => {
      live = false;
    };
  }, [session?.token]);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to connect. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (mode === "recover") {
        await request("/auth/recover", undefined, { email });
        setNotice(
          "If this address has an account, a recovery email has been requested. Check your inbox.",
        );
        return;
      }
      if (mode === "reset") {
        await request("/auth/reset", undefined, {
          accessToken: resetToken,
          password,
        });
        setResetToken("");
        setPassword("");
        setMode("login");
        setNotice("Your password was updated. Sign in with your new password.");
        return;
      }
      if (!adult) throw new Error("Please confirm you are 18 or older.");
      const data = await request<{
        confirmationRequired?: boolean;
        token?: string;
        player?: { id: string; name: string; kind?: string };
        expiresAt?: number;
      }>(`/auth/${mode}`, undefined, {
        email,
        password,
        ...(mode === "signup" ? { name } : {}),
        ageConfirmed: true,
      });
      setPassword("");
      if (data.confirmationRequired) {
        setNotice(
          "Registration accepted. Confirm your email before signing in.",
        );
        setMode("login");
        return;
      }
      if (!data.token || !data.player)
        throw new Error(
          "The authentication service did not return a session. Please try signing in again.",
        );
      onSession(
        accountSession({
          token: data.token,
          player: data.player,
          ...(data.expiresAt ? { expiresAt: data.expiresAt } : {}),
        }),
      );
      setNotice("Signed in securely. Your account is ready to play.");
    });
  }
  return (
    <div className="content-page account-panel">
      <div className="eyebrow">YOUR PLACE AT THE TABLE</div>
      <h1>Accounts & recovery</h1>
      <p>
        Guest play stays available. Accounts use a configured authentication
        provider; PlayNex never stores plaintext passwords.
      </p>
      {loading && (
        <p role="status" className="panel">
          Checking account availability…
        </p>
      )}
      {error && (
        <div role="alert" className="alert error">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="alert">
          {notice}
        </div>
      )}
      {features && !features.accounts && (
        <section className="panel">
          <h2>Account service is not configured</h2>
          <p>
            Registration, login, password recovery, and persistent profiles are
            unavailable until the founder connects Supabase. No account has been
            created. You can keep playing as a guest.
          </p>
        </section>
      )}
      {session && (
        <section className="panel">
          <h2>Your player profile</h2>
          <span
            className="avatar big"
            role="img"
            aria-label={`${avatar} avatar`}
          >
            {(
              { orbit: "◎", comet: "☄", nova: "✦", moon: "☾" } as Record<
                string,
                string
              >
            )[avatar] || "◎"}
          </span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const data = await request<{
                  profile?: { name: string };
                  name?: string;
                }>("/profile", session.token, { name, avatar }, "PATCH");
                onName(data.profile?.name || data.name || name);
                setNotice("Your profile was saved.");
              });
            }}
          >
            <label htmlFor="profile-name">Display name</label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={24}
              required
            />
            <label htmlFor="avatar">Avatar</label>
            <select
              id="avatar"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
            >
              <option value="orbit">Orbit</option>
              <option value="nova">Nova</option>
              <option value="moon">Moon</option>
              <option value="comet">Comet</option>
            </select>
            <Button disabled={busy} type="submit">
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </section>
      )}
      {callbackToken && features?.accounts && (
        <section className="panel">
          <h2>Complete email sign-in</h2>
          <p>
            Your email confirmation returned a secure session. Confirm your age
            to finish signing in.
          </p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={adult}
              onChange={(e) => setAdult(e.target.checked)}
            />
            I am 18 or older.
          </label>
          <Button
            disabled={busy || !adult}
            onClick={() =>
              void run(async () => {
                const data = await request<{
                  token: string;
                  player: { id: string; name: string; kind?: string };
                  expiresAt?: number;
                }>("/auth/exchange", undefined, {
                  accessToken: callbackToken,
                  ageConfirmed: true,
                });
                onSession(accountSession(data));
                setCallbackToken("");
                setNotice("Signed in after email confirmation.");
              })
            }
          >
            Complete sign-in
          </Button>
        </section>
      )}
      {features?.accounts && session?.player?.kind === "registered" ? (
        <>
          <section className="panel">
            <h2>Account access</h2>
            <p>
              Signing out closes this local session. Your account remains with
              the authentication provider.
            </p>
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await request("/auth/logout", session.token, {});
                  onLogout();
                  setNotice("You have signed out.");
                })
              }
            >
              Sign out
            </Button>
            {features.accountDeletion && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!deleteConfirmed) return;
                  void run(async () => {
                    await request(
                      "/account",
                      session.token,
                      undefined,
                      "DELETE",
                    );
                    onLogout();
                    setNotice("Your account was permanently deleted.");
                  });
                }}
              >
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  />
                  I understand account deletion is permanent and closes my
                  rooms.
                </label>
                <Button type="submit" disabled={busy || !deleteConfirmed}>
                  Permanently delete account
                </Button>
              </form>
            )}
            <p className="small">
              {features.accountDeletion
                ? "Permanent account deletion is configured by the authentication service. Use the deletion controls in your profile."
                : "Permanent account deletion is not configured yet. Do not use accounts for a public release until deletion and retention policies are approved."}
            </p>
          </section>
        </>
      ) : (
        features?.accounts && (
          <section className="panel">
            <div
              className="feature-tabs"
              role="group"
              aria-label="Account action"
            >
              {(["login", "signup", "recover"] as const).map((v) => (
                <Button
                  key={v}
                  disabled={busy}
                  className={mode === v ? "primary" : ""}
                  onClick={() => {
                    setMode(v);
                    setError("");
                    setNotice("");
                  }}
                >
                  {v === "login"
                    ? "Sign in"
                    : v === "signup"
                      ? "Register"
                      : "Recover account"}
                </Button>
              ))}
            </div>
            <h2>
              {mode === "login"
                ? "Welcome back"
                : mode === "signup"
                  ? "Create your account"
                  : mode === "recover"
                    ? "Recover your account"
                    : "Choose a new password"}
            </h2>
            <form onSubmit={(e) => void submit(e)}>
              {mode !== "reset" && (
                <>
                  <label htmlFor="account-email">Email address</label>
                  <input
                    id="account-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={254}
                    required
                  />
                </>
              )}
              {mode === "signup" && (
                <>
                  <label htmlFor="account-name">Display name</label>
                  <input
                    id="account-name"
                    autoComplete="nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    maxLength={24}
                    required
                  />
                </>
              )}
              {mode !== "recover" && (
                <>
                  <label htmlFor="account-password">
                    {mode === "reset" ? "New password" : "Password"}
                  </label>
                  <input
                    id="account-password"
                    type="password"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={mode === "login" ? 1 : 12}
                    maxLength={128}
                    required
                  />
                </>
              )}
              {mode === "reset" && !resetToken && (
                <>
                  <label htmlFor="recovery-token">Recovery access token</label>
                  <input
                    id="recovery-token"
                    type="password"
                    autoComplete="off"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                  />
                </>
              )}
              {(mode === "login" || mode === "signup") && (
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={adult}
                    onChange={(e) => setAdult(e.target.checked)}
                  />
                  I am 18 or older. This is an adult private beta.
                </label>
              )}
              <Button className="primary" type="submit" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in securely"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "recover"
                        ? "Send recovery email"
                        : "Update password"}
              </Button>
            </form>
          </section>
        )
      )}
    </div>
  );
}
