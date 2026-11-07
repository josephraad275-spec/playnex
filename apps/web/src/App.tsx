import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Compass,
  Copy,
  Gamepad2,
  Heart,
  Home,
  Link,
  Menu,
  MessageCircle,
  Moon,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button, EmptyState } from "../../../packages/ui/src";
import { getGameMetadata } from "../../../packages/game-sdk/src";

type GameId = "tic-tac-toe" | "four-in-a-row" | "quick-trivia";
type Game = {
  id: GameId;
  title: string;
  category: string;
  description: string;
  duration: string;
  color: string;
  art: string;
};
const presentation: {
  id: GameId;
  duration: string;
  color: string;
  art: string;
}[] = [
  { id: "tic-tac-toe", duration: "2 min", color: "mint", art: "grid" },
  { id: "four-in-a-row", duration: "5 min", color: "purple", art: "discs" },
  { id: "quick-trivia", duration: "3 min", color: "peach", art: "trivia" },
];
const games: Game[] = presentation.map((item) => {
  const metadata = getGameMetadata(item.id)!;
  return {
    ...item,
    title: metadata.title,
    description: metadata.description,
    category: metadata.category,
  };
});
interface Session {
  token: string;
  name: string;
  id?: string;
  playerId?: string;
  player?: { id: string; name: string };
}
interface Player {
  id: string;
  name: string;
  ready: boolean;
  connected?: boolean;
}
interface State {
  gameId: GameId;
  turn: number;
  winner: number | "draw" | null;
  board?: (number | null)[] | (number | null)[][];
  question?:
    string | { question?: string; prompt?: string; options?: string[] };
  options?: string[];
  scores?: number[];
  round?: number;
}
interface Room {
  version: number;
  id: string;
  gameId: GameId;
  players: Player[];
  members?: Player[];
  hostId: string;
  status: string;
  state?: State;
  game?: State;
  invite?: string;
  inviteToken?: string;
  playerIndex?: number;
  expiresAt?: number;
}
const stored = () => {
  try {
    return JSON.parse(
      sessionStorage.getItem("playnex-session") || "null",
    ) as Session | null;
  } catch {
    return null;
  }
};
const initialUrl = new URL(location.href);
const inviteRoom = initialUrl.searchParams.get("room");
const inviteToken = initialUrl.searchParams.get("invite");
function Art({ game, large = false }: { game: Game; large?: boolean }) {
  return (
    <div
      className={`game-art ${game.color} ${large ? "large" : ""}`}
      aria-hidden="true"
    >
      <span className="art-ring" />
      {game.art === "grid" ? (
        <div className="art-grid">
          <i>×</i>
          <i>○</i>
          <i />
          <i>○</i>
          <i>×</i>
          <i />
          <i />
          <i>○</i>
          <i>×</i>
        </div>
      ) : game.art === "discs" ? (
        <div className="art-discs">
          {Array.from({ length: 20 }, (_, i) => (
            <i key={i} className={i % 3 ? "disc-light" : "disc-dark"} />
          ))}
        </div>
      ) : (
        <>
          <span className="trivia-spark">✦</span>
          <span className="trivia-q">?</span>
          <span className="trivia-spark second">✧</span>
        </>
      )}
      <span className="art-label">PLAYNEX ORIGINAL</span>
    </div>
  );
}
export default function App() {
  const [page, setPage] = useState(inviteRoom ? "join" : "home"),
    [selected, setSelected] = useState<Game>(games[0]!),
    [session, setSession] = useState<Session | null>(stored),
    [name, setName] = useState(stored()?.name || ""),
    [room, setRoom] = useState<Room | null>(null),
    [invite, setInvite] = useState(inviteToken || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("All games"),
    [online, setOnline] = useState(navigator.onLine),
    [connected, setConnected] = useState(false),
    [menu, setMenu] = useState(false),
    [theme, setTheme] = useState(
      localStorage.getItem("playnex-theme") || "dark",
    ),
    [favorites, setFavorites] = useState<string[]>(() => {
      try {
        return JSON.parse(
          localStorage.getItem("playnex-favorites") || "[]",
        ) as string[];
      } catch {
        return [];
      }
    }),
    [age, setAge] = useState(false);
  const navigate = (next: string) => {
    setPage(next);
    setError("");
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("playnex-theme", theme);
  }, [theme]);
  useEffect(() => {
    const yes = () => setOnline(true),
      no = () => setOnline(false);
    window.addEventListener("online", yes);
    window.addEventListener("offline", no);
    return () => {
      window.removeEventListener("online", yes);
      window.removeEventListener("offline", no);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function api(path: string, body?: unknown, token = session?.token) {
    const response = await fetch(`/api${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = (await response.json()) as Record<string, unknown>;
    if (response.status === 401) {
      sessionStorage.removeItem("playnex-session");
      sessionStorage.removeItem("playnex-room");
      setSession(null);
      setRoom(null);
      setPage(inviteRoom ? "join" : "create");
    }
    if (response.status === 410) {
      sessionStorage.removeItem("playnex-room");
      setRoom(null);
      setPage("create");
    }
    if (!response.ok)
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "Something went wrong. Please try again.",
      );
    return data;
  }
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function ensureSession() {
    if (session) return session;
    if (!age)
      throw new Error(
        "Please confirm you are 18 or older to enter this private beta.",
      );
    if (name.trim().length < 2)
      throw new Error("Choose a display name with at least 2 characters.");
    const data = await api("/session", {
      name: name.trim(),
      ageConfirmed: true,
    });
    const next = { ...data, name: name.trim() } as unknown as Session;
    sessionStorage.setItem("playnex-session", JSON.stringify(next));
    setSession(next);
    return next;
  }
  function unpack(data: Record<string, unknown>) {
    const raw = (data.room || data) as Room;
    const value = { ...raw, players: raw.members || raw.players };
    setRoom((previous) =>
      previous?.id === value.id && previous.version > value.version
        ? previous
        : value,
    );
    sessionStorage.setItem("playnex-room", value.id);
    const token = (data.inviteToken ||
      data.invite ||
      value.inviteToken ||
      value.invite) as string | undefined;
    if (token) setInvite(token);
    return value;
  }
  async function create() {
    await run(async () => {
      const guest = await ensureSession();
      unpack(await api("/rooms", { gameId: selected.id }, guest.token));
      navigate("room");
    });
  }
  async function join() {
    await run(async () => {
      const guest = await ensureSession();
      unpack(
        await api(
          `/rooms/${encodeURIComponent(inviteRoom || room?.id || "")}/join`,
          { invite },
          guest.token,
        ),
      );
      navigate("room");
    });
  }
  async function action(type: string, extra: Record<string, unknown> = {}) {
    if (!room) return;
    await run(async () => {
      unpack(await api(`/rooms/${room.id}/action`, { type, ...extra }));
    });
  }
  useEffect(() => {
    if (!room?.id || !session?.token) return;
    let stopped = false;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const id = room.id;
    const connect = () => {
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws?room=${encodeURIComponent(id)}&token=${encodeURIComponent(session.token)}`,
      );
      socket.onopen = () => {
        setConnected(true);
        void api(`/rooms/${id}`)
          .then(unpack)
          .catch(() => {});
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as Record<
            string,
            unknown
          >;
          if (data.room || (data.id && data.players)) unpack(data);
        } catch {
          /* Ignore malformed transport messages. */
        }
      };
      socket.onclose = (event) => {
        setConnected(false);
        if (stopped) return;
        if (event.code === 1000 || event.code === 1008) {
          sessionStorage.removeItem("playnex-room");
          setRoom(null);
          setPage("create");
          if (event.reason.toLowerCase().includes("session")) {
            sessionStorage.removeItem("playnex-session");
            setSession(null);
          }
          setError(
            event.reason ||
              "This connection has ended. Create or join a new room.",
          );
          return;
        }
        retry = setTimeout(connect, 2000);
      };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, [room?.id, session?.token]);
  useEffect(() => {
    if (!session?.token) return;
    const saved = sessionStorage.getItem("playnex-room");
    const target = inviteRoom || saved;
    if (!target) return;
    let cancelled = false;
    void api(`/rooms/${encodeURIComponent(target)}`)
      .then((data) => {
        if (!cancelled) {
          unpack(data);
          setPage("room");
        }
      })
      .catch((e) => {
        if (!cancelled && saved === target) {
          sessionStorage.removeItem("playnex-room");
          setError(e instanceof Error ? e.message : "Room recovery failed.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session?.token]);
  async function exportGuest() {
    await run(async () => {
      const data = await api("/session/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "playnex-guest-data.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  const game = room
    ? games.find((g) => g.id === room.gameId) || selected
    : selected;
  const current = room?.state || room?.game;
  const self =
    room?.players.findIndex(
      (p) => p.id === (session?.player?.id || session?.playerId || session?.id),
    ) ?? -1;
  const playerIndex = room?.playerIndex ?? self;
  const host =
    room?.hostId ===
      (session?.player?.id || session?.playerId || session?.id) ||
    playerIndex === 0;
  const invitation = room
    ? `${location.origin}/?room=${encodeURIComponent(room.id)}&invite=${encodeURIComponent(invite)}`
    : "";
  const favorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((v) => v !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("playnex-favorites", JSON.stringify(next));
  };
  async function copy() {
    try {
      await navigator.clipboard.writeText(invitation);
      setNotice("Invitation link copied");
    } catch {
      setError(
        "Clipboard unavailable. Select and copy the invitation link below.",
      );
    }
  }
  const filters = [
    "All games",
    "Board & strategy",
    "Party & knowledge",
    "Favorites",
  ];
  const listed = games.filter(
    (g) =>
      (category === "All games" ||
        (category === "Favorites" && favorites.includes(g.id)) ||
        g.category === category) &&
      `${g.title} ${g.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  function onboarding() {
    return (
      <div className="onboarding">
        <label htmlFor="name">Your display name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={24}
          placeholder="What should friends call you?"
          autoComplete="nickname"
        />
        <label className="check-label">
          <input
            type="checkbox"
            checked={age}
            onChange={(e) => setAge(e.target.checked)}
          />
          I am 18 or older. I understand this is a private beta.
        </label>
        <p className="muted small">
          No email or password needed. Your guest session stays in this browser
          tab.
        </p>
      </div>
    );
  }
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <X size={19} />
        </button>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <span className="brand-mark">
            <Gamepad2 size={23} />
          </span>
          PlayNex<span className="brand-dot">.</span>
        </a>
        <span className="nav-label">YOUR PLAYGROUND</span>
        <nav aria-label="Main navigation">
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "catalog", label: "Discover games", icon: Compass },
            { id: "friends", label: "Friends & invites", icon: Users },
            { id: "leaderboards", label: "Leaderboards", icon: Trophy },
            { id: "favorites", label: "My favorites", icon: Heart },
          ].map((item) => (
            <button
              className={page === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              onClick={() => {
                if (item.id === "favorites") setCategory("Favorites");
                navigate(item.id);
              }}
            >
              <item.icon size={20} />
              {item.label}
              {item.id === "friends" && <span className="tiny-new">BETA</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="little-star">✦</span>
          <strong>Better with your people.</strong>
          <p>
            One link. Your friends.
            <br />
            Let the games begin.
          </p>
          <button
            onClick={() => {
              setSelected(games[0]!);
              navigate("create");
            }}
          >
            Start a game night <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => navigate("settings")}>
            <Settings size={20} />
            Settings
          </button>
          <button className="nav-item" onClick={() => navigate("help")}>
            <MessageCircle size={20} />
            Help & support
          </button>
          <button className="account" onClick={() => navigate("profile")}>
            <span className="avatar">
              {(session?.name || "G").slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{session?.name || "Your next adventure"}</strong>
              <small>{session ? "Guest player" : "Play as a guest"}</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span className="topbar-note">
            <span className="status-dot" />A little play goes a long way.
          </span>
          <div className="topbar-right">
            <span className="beta-pill">PRIVATE BETA · 18+</span>
            <button
              className="icon-button"
              aria-label="Toggle color theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="avatar mini"
              aria-label="Your profile"
              onClick={() => navigate("profile")}
            >
              {(session?.name || "G")[0]?.toUpperCase()}
            </button>
          </div>
        </header>
        <main id="main-content">
          {!online && (
            <div className="alert">
              You’re offline. Live games need an internet connection. Your guest
              session is saved.
            </div>
          )}
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              <Check size={18} />
              {notice}
            </div>
          )}
          {(page === "home" || page === "catalog" || page === "favorites") && (
            <>
              {page === "home" ? (
                <>
                  <div className="eyebrow">
                    <span /> MAKE TIME FOR A LITTLE FUN
                  </div>
                  <section className="hero">
                    <div className="hero-content">
                      <span className="pill">
                        <Sparkles size={14} /> Your people. Your playground.
                      </span>
                      <h1>
                        Good games.
                        <br />
                        <span>Great company.</span>
                      </h1>
                      <p>
                        Turn “what should we do?” into one more round.
                        <br className="desktop-break" /> Play together, wherever
                        together happens.
                      </p>
                      <div className="hero-actions">
                        <Button
                          className="primary"
                          onClick={() => {
                            setSelected(games[0]!);
                            navigate("create");
                          }}
                        >
                          <Plus size={18} />
                          Create a private room
                          <ArrowRight size={17} />
                        </Button>
                        <button
                          className="text-button"
                          onClick={() => navigate("catalog")}
                        >
                          Explore games <ArrowUpRight size={17} />
                        </button>
                      </div>
                      <div className="hero-foot">
                        <span>
                          <Shield size={14} />
                          Private rooms
                        </span>
                        <span>
                          <Zap size={14} />
                          No downloads
                        </span>
                        <span>
                          <Users size={14} />
                          Guest friendly
                        </span>
                      </div>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <span className="orbit orbit-one" />
                      <span className="orbit orbit-two" />
                      <div className="floating-chip chip-top">
                        <span className="chip-avatar">☺</span>Good to see you!{" "}
                        <span>✦</span>
                      </div>
                      <div className="hero-board">
                        <div className="board-top">
                          <span className="dot mint-dot" />
                          <span className="dot purple-dot" />
                          <span className="dot peach-dot" />
                        </div>
                        <div className="hero-board-grid">
                          {["×", "○", "×", "○", "×", "", "", "○", "×"].map(
                            (s, i) => (
                              <span
                                className={s === "×" ? "cross" : "circle"}
                                key={i}
                              >
                                {s}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                      <div className="floating-chip chip-bottom">
                        <span>✧</span> A friendly rivalry starts here.
                      </div>
                      <span className="hero-star star-one">✦</span>
                      <span className="hero-star star-two">✧</span>
                    </div>
                  </section>
                  <div className="intro-strip">
                    <span>
                      <Link size={18} />
                      <strong>Less setup. More play.</strong>
                    </span>
                    <p>
                      Pick a game, share a link, and bring your favorite people.
                    </p>
                    <span className="free-label">
                      Always a free seat at the table <ArrowUpRight size={15} />
                    </span>
                  </div>
                </>
              ) : (
                <div className="page-heading">
                  <div className="eyebrow">FIND YOUR NEXT FAVORITE</div>
                  <h1>
                    {page === "favorites"
                      ? "Your favorites"
                      : "Discover your kind of fun."}
                  </h1>
                  <p>Original games. Real connections. One more round?</p>
                </div>
              )}
              <section className="catalog-section">
                <div className="section-title">
                  <div>
                    <div className="eyebrow">SMALL GAMES. BIG CONNECTIONS.</div>
                    <h2>
                      {page === "home"
                        ? "Find your next “one more round”"
                        : "The game room"}
                    </h2>
                  </div>
                  {page === "home" && (
                    <button
                      className="text-button"
                      onClick={() => navigate("catalog")}
                    >
                      View all games <ArrowRight size={17} />
                    </button>
                  )}
                </div>
                <div className="catalog-tools">
                  <div
                    className="filters"
                    role="group"
                    aria-label="Game category"
                  >
                    {filters.map((f) => (
                      <button
                        key={f}
                        className={category === f ? "selected" : ""}
                        onClick={() => setCategory(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={17} />
                    <input
                      aria-label="Search games"
                      placeholder="Find a game…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                <div className="games-grid">
                  {listed.map((g) => (
                    <article className="game-card" key={g.id}>
                      <button
                        className="art-button"
                        aria-label={`View ${g.title}`}
                        onClick={() => {
                          setSelected(g);
                          navigate("detail");
                        }}
                      >
                        <Art game={g} />
                      </button>
                      <button
                        className={`favorite ${favorites.includes(g.id) ? "saved" : ""}`}
                        aria-label={`${favorites.includes(g.id) ? "Remove" : "Add"} ${g.title} ${favorites.includes(g.id) ? "from" : "to"} favorites`}
                        onClick={() => favorite(g.id)}
                      >
                        <Heart size={17} />
                      </button>
                      <div className="game-card-body">
                        <div className="game-category">
                          {g.category}
                          <span>FREE</span>
                        </div>
                        <h3>
                          <button
                            onClick={() => {
                              setSelected(g);
                              navigate("detail");
                            }}
                          >
                            {g.title}
                          </button>
                          <ArrowUpRight size={18} />
                        </h3>
                        <p>{g.description}</p>
                        <div className="game-meta">
                          <span>
                            <Users size={14} />2 players
                          </span>
                          <span>◷ {g.duration}</span>
                          <span className="game-ready">Private rooms</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {listed.length === 0 && (
                  <EmptyState title="No games found">
                    Try a different search, or add a game to your favorites.
                  </EmptyState>
                )}
              </section>
              <section className="night-banner">
                <span className="night-icon">
                  <Users size={30} />
                </span>
                <div>
                  <span className="eyebrow">THE BEST KIND OF SCREEN TIME</span>
                  <h2>Make tonight a game night.</h2>
                  <p>
                    No sign-up hurdles. No crowded public lobbies. Just you and
                    your people.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelected(games[0]!);
                    navigate("create");
                  }}
                >
                  Bring your friends <ArrowRight size={17} />
                </Button>
                <span className="banner-star" aria-hidden="true">
                  ✧
                </span>
              </section>
              <div className="roadmap-note">
                <Sparkles size={18} />
                <span>More ways to play are on the way.</span> Draw & Guess and
                Checkers are planned. Only the three games above are available
                in this beta.
              </div>
            </>
          )}
          {page === "detail" && (
            <>
              <button className="back-link" onClick={() => navigate("catalog")}>
                ← Back to games
              </button>
              <div className="detail-grid">
                <Art game={selected} large />
                <section>
                  <span className="pill">PLAYNEX ORIGINAL · FREE</span>
                  <h1>{selected.title}</h1>
                  <p>{selected.description}</p>
                  <div className="detail-meta">
                    <span>
                      <Users />2 players
                    </span>
                    <span>
                      <Shield />
                      Private room
                    </span>
                    <span>
                      <Zap />
                      {selected.duration}
                    </span>
                  </div>
                  <h3>How to play</h3>
                  <p>
                    {selected.id === "tic-tac-toe"
                      ? "Take turns placing a mark in an empty square. The first player to connect three marks in a row, column, or diagonal wins. A full board without a line is a draw."
                      : selected.id === "four-in-a-row"
                        ? "Take turns dropping a disc into a column. Connect four discs horizontally, vertically, or diagonally to win. A full board without a winning line is a draw."
                        : "Answer each original multiple-choice question when it is your turn. Correct answers earn points. The highest score at the end wins; equal scores draw."}
                  </p>
                  <Button
                    className="primary"
                    onClick={() => navigate("create")}
                  >
                    <Plus size={18} />
                    Create private room
                  </Button>
                  <p className="muted small">
                    A room holds two players. Share the invitation with someone
                    you trust.
                  </p>
                </section>
              </div>
            </>
          )}
          {(page === "create" || page === "join") && (
            <div className="form-page">
              <span className="large-icon">
                <Gamepad2 size={30} />
              </span>
              <div className="eyebrow">LET’S GET EVERYONE TOGETHER</div>
              <h1>
                {page === "join"
                  ? "You’re invited."
                  : "Your game night starts here."}
              </h1>
              <p>
                {page === "join"
                  ? "Join your friend’s private game room."
                  : "Pick your game and send a little fun to a friend."}
              </p>
              {page === "create" && (
                <label>
                  Choose a game
                  <select
                    value={selected.id}
                    onChange={(e) =>
                      setSelected(games.find((g) => g.id === e.target.value)!)
                    }
                  >
                    {games.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!session ? (
                onboarding()
              ) : (
                <p className="guest-chip">
                  <span className="avatar mini">
                    {session.name[0]?.toUpperCase()}
                  </span>
                  Playing as <strong>{session.name}</strong>
                </p>
              )}
              <Button
                className="primary full"
                disabled={busy || !online}
                onClick={() => void (page === "join" ? join() : create())}
              >
                {busy
                  ? "Connecting…"
                  : page === "join"
                    ? "Join private room"
                    : "Create room"}
                <ArrowRight size={18} />
              </Button>
              <p className="muted small">
                By playing, you acknowledge our{" "}
                <button
                  className="inline-link"
                  onClick={() => navigate("privacy")}
                >
                  beta privacy and safety notice
                </button>
                . Public chat and payments are disabled.
              </p>
            </div>
          )}
          {page === "room" && room && (
            <>
              <div className="room-heading">
                <div>
                  <div className="eyebrow">YOUR PRIVATE GAME ROOM</div>
                  <h1>{game.title}</h1>
                </div>
                <span className={`connection ${connected ? "live" : ""}`}>
                  <span />
                  {connected ? "Live connection" : "Reconnecting…"}
                </span>
              </div>
              <div className="room-layout">
                <section className="play-panel">
                  <div className="players-bar">
                    {room.players.map((p, i) => (
                      <div
                        className={
                          current?.turn === i ? "player current" : "player"
                        }
                        key={p.id}
                      >
                        <span className={`avatar player-${i}`}>
                          {p.name[0]?.toUpperCase()}
                        </span>
                        <div>
                          <strong>
                            {p.name}
                            {i === playerIndex ? " (you)" : ""}
                          </strong>
                          <small>
                            {current
                              ? current.turn === i
                                ? "Their turn"
                                : "Waiting"
                              : p.ready
                                ? "Ready to play"
                                : "Not ready"}
                          </small>
                        </div>
                        <span>{i === 0 ? "×" : "○"}</span>
                      </div>
                    ))}
                  </div>
                  {!current ||
                  room.status === "waiting" ||
                  room.status === "lobby" ? (
                    <div className="lobby">
                      <span className="lobby-orb">
                        <Users size={44} />
                      </span>
                      <h2>
                        {room.players.length < 2
                          ? "Good company is on the way."
                          : "Ready for a little rivalry?"}
                      </h2>
                      <p>
                        {room.players.length < 2
                          ? "Share the invitation link with a friend to fill the second seat."
                          : "Both players need to be ready before the host starts the match."}
                      </p>
                      <Button
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          void action("ready", {
                            ready: !room.players[playerIndex]?.ready,
                          })
                        }
                      >
                        {" "}
                        {room.players[playerIndex]?.ready
                          ? "Update ready status"
                          : "I’m ready"}
                        <Check size={18} />
                      </Button>
                      {host && (
                        <Button
                          disabled={
                            busy ||
                            room.players.length < 2 ||
                            !room.players.every((p) => p.ready)
                          }
                          onClick={() => void action("start")}
                        >
                          Start match <Play size={16} />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="game-stage">
                      {current.winner !== null &&
                        current.winner !== undefined && (
                          <div className="result">
                            <Trophy size={35} />
                            <h2>
                              {current.winner === "draw"
                                ? "A well-matched draw!"
                                : `${room.players[current.winner]?.name || "Player"} wins!`}
                            </h2>
                            <p>Good game. There’s always another round.</p>
                            <Button
                              className="primary"
                              disabled={busy}
                              onClick={() => void action("rematch")}
                            >
                              Request rematch <ArrowRight size={17} />
                            </Button>
                          </div>
                        )}
                      {current.gameId === "quick-trivia" ? (
                        <div className="trivia-game">
                          <span className="pill">
                            ROUND {(current.round ?? 0) + 1}
                          </span>
                          <p className="trivia-score">
                            {room.players
                              .map(
                                (p, i) =>
                                  `${p.name}: ${current.scores?.[i] ?? 0}`,
                              )
                              .join(" · ")}
                          </p>
                          <h2>
                            {typeof current.question === "string"
                              ? current.question
                              : current.question?.question ||
                                current.question?.prompt ||
                                "Waiting for the next question…"}
                          </h2>
                          <div className="answer-options">
                            {(
                              current.options ||
                              (typeof current.question === "object"
                                ? current.question.options
                                : []) ||
                              []
                            ).map((answer, i) => (
                              <Button
                                data-testid={`trivia-option-${i}`}
                                key={answer}
                                disabled={
                                  busy ||
                                  current.turn !== playerIndex ||
                                  current.winner !== null
                                }
                                onClick={() =>
                                  void action("move", { move: { answer: i } })
                                }
                              >
                                <span>{String.fromCharCode(65 + i)}</span>
                                {answer}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`board ${current.gameId === "four-in-a-row" ? "four-board" : "tic-board"}`}
                          role="group"
                          aria-label={`${game.title} game board`}
                        >
                          {(current.board?.flat() || []).map((cell, i) => (
                            <button
                              key={i}
                              data-testid={`board-cell-${i}`}
                              aria-label={`Cell ${i + 1}${cell === 0 ? ", player one" : cell === 1 ? ", player two" : ", empty"}`}
                              disabled={
                                busy ||
                                current.turn !== playerIndex ||
                                current.winner !== null
                              }
                              className={
                                cell === 0
                                  ? "mark-one"
                                  : cell === 1
                                    ? "mark-two"
                                    : ""
                              }
                              onClick={() =>
                                void action("move", {
                                  move:
                                    current.gameId === "four-in-a-row"
                                      ? { column: i % 7 }
                                      : { cell: i },
                                })
                              }
                            >
                              {current.gameId === "four-in-a-row" ? (
                                <span
                                  className={
                                    cell === 0
                                      ? "filled one"
                                      : cell === 1
                                        ? "filled two"
                                        : ""
                                  }
                                />
                              ) : cell === 0 ? (
                                "×"
                              ) : cell === 1 ? (
                                "○"
                              ) : (
                                ""
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {current.winner === null && (
                        <p data-testid="game-status" className="turn-label">
                          {current.turn === playerIndex
                            ? "Your turn. Make your move."
                            : `Waiting for ${room.players[current.turn]?.name || "your friend"}…`}
                        </p>
                      )}
                    </div>
                  )}
                </section>
                <aside className="room-side">
                  <div className="panel">
                    <span className="eyebrow">A LINK TO A GOOD TIME</span>
                    <h2>Invite your person.</h2>
                    <p>
                      Anyone with this link can take the open seat. Keep it
                      private.
                    </p>
                    <label htmlFor="invitation">Room invitation</label>
                    <input
                      data-testid="invitation-link"
                      id="invitation"
                      readOnly
                      value={invitation}
                    />
                    <Button
                      className="primary full"
                      onClick={() => void copy()}
                    >
                      <Copy size={16} />
                      Copy invitation
                    </Button>
                    <a
                      className="button whatsapp full"
                      href={`https://wa.me/?text=${encodeURIComponent(`Join me for ${game.title} on PlayNex! ${invitation}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle size={17} />
                      Share on WhatsApp
                    </a>
                    <p className="muted small">
                      Choose a friend or group inside WhatsApp. Play opens in
                      their browser.
                    </p>
                  </div>
                  <div className="safety-note">
                    <Shield size={20} />
                    <p>
                      Just your invited players. No public chat, no contact
                      collection.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {page === "profile" && (
            <div className="form-page">
              <span className="avatar big">
                {(session?.name || "G")[0]?.toUpperCase()}
              </span>
              <h1>{session?.name || "Make yourself at home."}</h1>
              <p>
                {session
                  ? "You’re playing as a guest."
                  : "Choose a name when you create or join your first room."}
              </p>
              <div className="panel">
                <h2>Your guest profile</h2>
                <p>
                  Guest identity is saved in this tab. Registered accounts,
                  cloud profiles, persistent achievements, and account recovery
                  are not available in this beta.
                </p>
                <Button onClick={() => navigate("create")}>
                  Start a game <ArrowRight size={16} />
                </Button>
              </div>
              {session && (
                <>
                  <Button disabled={busy} onClick={() => void exportGuest()}>
                    Export guest data
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const response = await fetch("/api/session", {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${session.token}` },
                        });
                        if (!response.ok)
                          throw new Error(
                            "Could not delete guest session. Please retry.",
                          );
                        sessionStorage.removeItem("playnex-session");
                        sessionStorage.removeItem("playnex-room");
                        history.replaceState(null, "", "/");
                        setSession(null);
                        setRoom(null);
                        setNotice("Guest session deleted.");
                        navigate("home");
                      })
                    }
                  >
                    Delete guest data and close rooms
                  </Button>
                </>
              )}
            </div>
          )}
          {page === "settings" && (
            <div className="content-page">
              <div className="eyebrow">MAKE IT YOURS</div>
              <h1>Settings</h1>
              <section className="panel setting">
                <div>
                  <h2>Appearance</h2>
                  <p>Choose the view that feels right for you.</p>
                </div>
                <Button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}Use{" "}
                  {theme === "dark" ? "light" : "dark"} mode
                </Button>
              </section>
              <section className="panel">
                <h2>Comfort & accessibility</h2>
                <p>
                  PlayNex respects your device’s reduced-motion setting. Browser
                  zoom and system text scaling are supported. Every game is
                  keyboard accessible.
                </p>
              </section>
              <section className="panel">
                <h2>Privacy & safety</h2>
                <p>
                  Private rooms, no public messaging, no behavioral advertising.
                </p>
                <Button onClick={() => navigate("privacy")}>
                  Read safety information <Shield size={17} />
                </Button>
              </section>
            </div>
          )}
          {page === "friends" && (
            <div className="content-page">
              <div className="eyebrow">BETTER TOGETHER</div>
              <h1>Friends & invitations</h1>
              <EmptyState title="A great game starts with an invitation.">
                Create a private room, then copy its secure invitation or share
                it through WhatsApp. Persistent friend lists, blocking, group
                voting, and saved invitations are under development.
              </EmptyState>
              <Button className="primary" onClick={() => navigate("create")}>
                Create a room <Plus size={18} />
              </Button>
            </div>
          )}
          {page === "leaderboards" && (
            <div className="content-page">
              <div className="eyebrow">PLAY FOR THE GOOD TIMES</div>
              <h1>Leaderboards</h1>
              <EmptyState title="A fair competition takes a little care.">
                Global rankings, tournaments, and persistent achievements are
                not available yet. Match results are calculated by the game
                server inside your private room.
              </EmptyState>
              <Button onClick={() => navigate("catalog")}>
                Find a game <ArrowRight size={17} />
              </Button>
            </div>
          )}
          {page === "privacy" && (
            <div className="content-page prose">
              <div className="eyebrow">YOUR SPACE TO PLAY</div>
              <h1>Privacy & safety</h1>
              <section className="panel">
                <h2>Private beta for adults</h2>
                <p>
                  This beta is restricted to players aged 18 and older while
                  regional child-privacy and consent requirements are reviewed.
                  It is not approved for a global launch to children.
                </p>
                <h2>What is stored</h2>
                <p>
                  Your display name, guest session, room membership, and moves
                  are held by the game service. This browser tab stores a guest
                  token; favorites and theme stay on your device. No email,
                  location, payment details, or contacts are requested. Guest
                  tokens grant access to your room: do not share them.
                </p>
                <h2>Play with people you trust</h2>
                <p>
                  Invitation links grant access to an open seat. Public
                  messaging and voice chat are disabled. Blocking and an in-app
                  report workflow are not implemented. Leave a room by
                  navigating home and avoid sharing links publicly. Do not use
                  this beta for sensitive interactions.
                </p>
                <h2>Data controls</h2>
                <p>
                  Export or delete your guest data from your profile. Deletion
                  closes your rooms. Guest sessions expire after 24 hours, rooms
                  after two hours; all data is lost on a server restart. Durable
                  account deletion remains unavailable. Public analytics and
                  advertising are disabled.
                </p>
              </section>
            </div>
          )}
          {page === "help" && (
            <div className="content-page prose">
              <div className="eyebrow">A LITTLE HELP</div>
              <h1>Let’s get you playing.</h1>
              <section className="panel">
                <h2>How do I play with a friend?</h2>
                <p>
                  Pick a game, create a room, enter a guest name, and share the
                  invitation. Your friend joins in their browser. Both players
                  mark ready, then the host starts.
                </p>
                <h2>Lost your connection?</h2>
                <p>
                  Keep the game tab open. PlayNex reconnects and requests the
                  latest state automatically. Rooms and sessions are temporary;
                  a server restart ends them in this beta.
                </p>
                <h2>Where are accounts and payments?</h2>
                <p>
                  They are not enabled yet. Guest gameplay is free. Do not send
                  payment or sensitive personal information to anyone claiming
                  to sell access.
                </p>
                <h2>Need to report a problem?</h2>
                <p>
                  A monitored support channel and reporting tools must be
                  configured before public launch. Beta testers should report
                  issues through the repository’s GitHub Issues.
                </p>
                <a
                  className="button"
                  href="https://github.com/josephraad275-spec/playnex/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open GitHub Issues <ArrowUpRight size={16} />
                </a>
              </section>
            </div>
          )}
          {page === "premium" && (
            <div className="content-page">
              <div className="eyebrow">PLAY COMES FIRST</div>
              <h1>Great company is free.</h1>
              <EmptyState title="No payments. No subscriptions. Just play.">
                Premium subscriptions, cosmetics, and purchases are not
                available. The three beta games are free. Future paid features
                require payment testing and founder approval.
              </EmptyState>
              <Button onClick={() => navigate("catalog")}>
                Explore free games <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </main>
        <footer>
          <a
            className="footer-brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("home");
            }}
          >
            PlayNex<span>.</span>
          </a>
          <span>A little play. A lot of connection.</span>
          <div>
            <button onClick={() => navigate("privacy")}>
              Privacy & safety
            </button>
            <button onClick={() => navigate("help")}>Help</button>
            <button onClick={() => navigate("premium")}>Free beta</button>
          </div>
          <small>© {new Date().getFullYear()} PlayNex</small>
        </footer>
      </div>
    </div>
  );
}
