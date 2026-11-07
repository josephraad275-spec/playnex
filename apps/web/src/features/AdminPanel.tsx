import { useEffect, useState } from "react";
import { Button } from "../../../../packages/ui/src";
import { request, type AccountSession } from "./client";
interface Dashboard {
  catalog: { gameId: string; enabled: boolean }[];
  reports: {
    id: string;
    roomId: string;
    reporterId: string;
    playerId: string;
    reason: string;
    status: string;
    createdAt: number | string;
  }[];
  stats: { sessions: number; rooms: number; reports: number };
}
export default function AdminPanel({
  session,
}: {
  session: AccountSession | null;
}) {
  const [data, setData] = useState<Dashboard | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let live = true;
    if (!session) {
      setError("Sign in with an authorized administrator account.");
      setLoading(false);
      return;
    }
    request<Dashboard>("/admin", session.token)
      .then((v) => {
        if (live) setData(v);
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
  async function toggle(gameId: string, enabled: boolean) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const next = await request<{ catalog: Dashboard["catalog"] }>(
        "/admin/catalog",
        session.token,
        { gameId, enabled },
        "PATCH",
      );
      setData((old) => (old ? { ...old, catalog: next.catalog } : old));
      setNotice("Game availability updated for this server session.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }
  async function review(
    reportId: string,
    status: "open" | "reviewing" | "closed",
  ) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const next = await request<{ report: Dashboard["reports"][number] }>(
        "/admin/reports",
        session.token,
        { reportId, status },
        "PATCH",
      );
      setData((old) =>
        old
          ? {
              ...old,
              reports: old.reports.map((report) =>
                report.id === next.report.id ? next.report : report,
              ),
            }
          : old,
      );
      setNotice("Report review status updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report update failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="content-page admin-panel">
      <div className="eyebrow">AUTHORIZED OPERATIONS ONLY</div>
      <h1>Administration</h1>
      <p>
        Every request is authorized by the backend. These beta controls and
        statistics are temporary server state, not a durable production
        moderation system.
      </p>
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
      {loading && (
        <p role="status" className="panel">
          Checking administrator access…
        </p>
      )}
      {data && (
        <>
          <section className="panel">
            <h2>Current server activity</h2>
            <dl className="admin-stats">
              <div>
                <dt>Sessions</dt>
                <dd>{data.stats.sessions}</dd>
              </div>
              <div>
                <dt>Rooms</dt>
                <dd>{data.stats.rooms}</dd>
              </div>
              <div>
                <dt>Reports</dt>
                <dd>{data.stats.reports}</dd>
              </div>
            </dl>
          </section>
          <section className="panel">
            <h2>Game availability</h2>
            <ul className="feature-list">
              {data.catalog.map((game) => (
                <li key={game.gameId}>
                  <div>
                    <strong>{game.gameId}</strong>
                    <span className="small muted">
                      {game.enabled ? "Available" : "Disabled"}
                    </span>
                  </div>
                  <Button
                    disabled={busy}
                    onClick={() => void toggle(game.gameId, !game.enabled)}
                  >
                    {game.enabled ? "Disable" : "Enable"} {game.gameId}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>Reported concerns</h2>
            {data.reports.length === 0 ? (
              <p>No reports awaiting review.</p>
            ) : (
              <ul className="feature-list reports-list">
                {data.reports.map((report) => (
                  <li key={report.id}>
                    <div>
                      <strong>
                        {report.status} · {report.id}
                      </strong>
                      <p>{report.reason}</p>
                      <span className="small muted">
                        Room {report.roomId} · reported player {report.playerId}
                      </span>
                      <div className="feature-tabs">
                        <Button
                          disabled={busy || report.status === "reviewing"}
                          onClick={() => void review(report.id, "reviewing")}
                        >
                          Review report
                        </Button>
                        <Button
                          disabled={busy || report.status === "closed"}
                          onClick={() => void review(report.id, "closed")}
                        >
                          Close report
                        </Button>
                        <Button
                          disabled={busy || report.status === "open"}
                          onClick={() => void review(report.id, "open")}
                        >
                          Reopen report
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="small muted">
              Review status is recorded for this server session. Durable audit
              trails and a staffed moderation process must be established before
              public release.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
