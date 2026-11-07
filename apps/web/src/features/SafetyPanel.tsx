import { useEffect, useState, type FormEvent } from "react";
import { Button, EmptyState } from "../../../../packages/ui/src";
import { request, type AccountSession } from "./client";
export interface SafetyTarget {
  playerId: string;
  name: string;
  roomId: string;
  action?: "report" | "block";
}
interface Report {
  id: string;
  playerId: string;
  roomId: string;
  reason: string;
  status: string;
  createdAt: number | string;
}
interface Block {
  playerId: string;
  createdAt: number | string;
}
function knownNames(): Record<string, string> {
  try {
    return JSON.parse(
      sessionStorage.getItem("playnex-player-names") || "{}",
    ) as Record<string, string>;
  } catch {
    return {};
  }
}
export default function SafetyPanel({
  session,
  target,
  onBlocked,
}: {
  session: AccountSession | null;
  target: SafetyTarget | null;
  onBlocked: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>([]),
    [reports, setReports] = useState<Report[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reason, setReason] = useState(""),
    [names, setNames] = useState(knownNames);
  useEffect(() => {
    if (target) {
      const next = { ...knownNames(), [target.playerId]: target.name };
      sessionStorage.setItem("playnex-player-names", JSON.stringify(next));
      setNames(next);
    }
  }, [target]);
  async function refresh() {
    if (!session) return;
    const [b, r] = await Promise.all([
      request<{ blocks: Block[] }>("/blocks", session.token),
      request<{ reports: Report[] }>("/reports", session.token),
    ]);
    setBlocks(b.blocks);
    setReports(r.reports);
  }
  useEffect(() => {
    let live = true;
    if (!session) {
      setLoading(false);
      return;
    }
    Promise.all([
      request<{ blocks: Block[] }>("/blocks", session.token),
      request<{ reports: Report[] }>("/reports", session.token),
    ])
      .then(([b, r]) => {
        if (live) {
          setBlocks(b.blocks);
          setReports(r.reports);
        }
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
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function report(event: FormEvent) {
    event.preventDefault();
    if (!session || !target) return;
    await run(async () => {
      await request("/reports", session.token, {
        roomId: target.roomId,
        playerId: target.playerId,
        reason,
      });
      setReason("");
      setNotice(
        "Report submitted. Beta reports require review by the founder; immediate review is not guaranteed.",
      );
      await refresh();
    });
  }
  return (
    <div className="content-page safety-panel">
      <div className="eyebrow">KEEP PLAY FRIENDLY</div>
      <h1>Your safety center</h1>
      <p>
        Private rooms, no open chat, and controls for the people you meet. Beta
        moderation records are temporary and are erased when the server
        restarts.
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
      {!session ? (
        <EmptyState title="Play safely from your first room">
          Create or join a room as a guest to use blocking and reporting. No
          public messages or voice calls are enabled.
        </EmptyState>
      ) : (
        <>
          {target && (
            <section className="panel">
              <h2>Playing with {target.name}</h2>
              <p>
                Report a concern while you share a room. Blocking closes your
                shared room and prevents either player joining the other’s rooms
                while this server session exists.
              </p>
              <form onSubmit={(e) => void report(e)}>
                <label htmlFor="report-reason">Report reason</label>
                <textarea
                  id="report-reason"
                  rows={4}
                  minLength={10}
                  maxLength={1000}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe what happened (10–1,000 characters). Do not include sensitive personal information."
                />
                <Button type="submit" disabled={busy} className="primary">
                  {busy ? "Saving…" : "Submit report"}
                </Button>
              </form>
              <Button
                disabled={
                  busy || blocks.some((b) => b.playerId === target.playerId)
                }
                onClick={() =>
                  void run(async () => {
                    await request("/blocks", session.token, {
                      playerId: target.playerId,
                      roomId: target.roomId,
                    });
                    setNotice(
                      `${target.name} is blocked. Your shared room has been closed.`,
                    );
                    onBlocked();
                    await refresh();
                  })
                }
              >
                Block {target.name}
              </Button>
            </section>
          )}
          {loading ? (
            <p role="status" className="panel">
              Loading your safety settings…
            </p>
          ) : (
            <>
              <section className="panel">
                <h2>Blocked players</h2>
                {blocks.length === 0 ? (
                  <p>You haven’t blocked anyone.</p>
                ) : (
                  <ul className="feature-list">
                    {blocks.map((block) => (
                      <li key={block.playerId}>
                        <div>
                          <strong>{names[block.playerId] || "Player"}</strong>
                          <span className="small muted">
                            ID: {block.playerId}
                          </span>
                        </div>
                        <Button
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await request(
                                "/blocks",
                                session.token,
                                { playerId: block.playerId },
                                "DELETE",
                              );
                              setNotice("Player unblocked.");
                              await refresh();
                            })
                          }
                        >
                          Unblock {names[block.playerId] || "player"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="panel">
                <h2>Your reports</h2>
                {reports.length === 0 ? (
                  <p>No reports submitted.</p>
                ) : (
                  <ul className="feature-list reports-list">
                    {reports.map((report) => (
                      <li key={report.id}>
                        <div>
                          <strong>
                            {names[report.playerId] || "Player"} ·{" "}
                            {report.status}
                          </strong>
                          <p>{report.reason}</p>
                          <span className="small muted">
                            Report {report.id}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="small muted">
                  This is not an emergency service. In an immediate emergency,
                  contact your local emergency services. Only share room links
                  with people you trust.
                </p>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
