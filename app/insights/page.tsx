"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Check,
  ChevronUp,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { questions, type Answers, type Question } from "../../lib/questions";

type RecordItem = {
  id: string;
  createdAt: string;
  isDemo: boolean;
  ip: string | null;
  possibleRepeat: boolean;
  answers: Answers;
};
type Tab = "overview" | "questions" | "responses";
const themes: { name: string; words: string[]; color: string }[] = [
  {
    name: "Recycling & waste",
    words: ["recycl", "waste", "bin", "litter", "compost"],
    color: "#60b89b",
  },
  {
    name: "Energy & solar",
    words: ["energ", "electric", "solar", "light", "power"],
    color: "#d6a355",
  },
  { name: "Water", words: ["water", "tap", "leak"], color: "#63a8c7" },
  {
    name: "Plastic",
    words: ["plastic", "reus", "refill", "bottle"],
    color: "#b599db",
  },
  {
    name: "Awareness & participation",
    words: [
      "aware",
      "workshop",
      "promot",
      "student",
      "volunteer",
      "event",
      "educat",
    ],
    color: "#e18785",
  },
  {
    name: "Digital & reporting",
    words: [
      "digital",
      "dashboard",
      "portal",
      "online",
      "progress",
      "report",
      "app",
    ],
    color: "#8a9dd8",
  },
  {
    name: "Green spaces",
    words: ["green", "plant", "tree", "garden"],
    color: "#91b85d",
  },
  {
    name: "Electronic waste",
    words: ["e-waste", "electronic", "device", "computer"],
    color: "#a9a185",
  },
];
const pct = (count: number, total: number) =>
  total ? Math.round((count / total) * 100) : 0;
function distribution(data: RecordItem[], q: Question) {
  return (
    q.options?.map((option) => ({
      label: option,
      count: data.filter((r) =>
        Array.isArray(r.answers[q.id])
          ? (r.answers[q.id] as string[]).includes(option)
          : r.answers[q.id] === option,
      ).length,
    })) || []
  );
}
function Bars({
  data,
  total,
  limit = 20,
}: {
  data: { label: string; count: number }[];
  total: number;
  limit?: number;
}) {
  return (
    <div className="r-bars">
      {data.slice(0, limit).map((item) => (
        <div key={item.label}>
          <div className="r-bar-copy">
            <span>{item.label}</span>
            <strong>
              {pct(item.count, total)}% <small>({item.count})</small>
            </strong>
          </div>
          <div className="r-bar-track">
            <div style={{ width: `${pct(item.count, total)}%` }} />
          </div>
        </div>
      ))}
      {!total && <p className="r-empty">No responses to display yet.</p>}
    </div>
  );
}
export default function InsightsPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [includeDemo, setIncludeDemo] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlyRepeat, setOnlyRepeat] = useState(false);
  const load = useCallback(async () => {
    const res = await fetch("/api/admin/data", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { responses: RecordItem[] };
      setRecords(data.responses);
      setAuthenticated(true);
    } else setAuthenticated(false);
  }, []);
  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ authenticated: boolean }>)
      .then((d) => (d.authenticated ? load() : setAuthenticated(false)))
      .catch(() => setAuthenticated(false));
  }, [load]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      setPasscode("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unlock results.");
    } finally {
      setBusy(false);
    }
  }
  async function action(name: "seed" | "clear-demo" | "logout") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/${name}`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Action failed.");
      if (name === "logout") {
        setAuthenticated(false);
        setRecords([]);
      } else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function deleteResponse(id: string) {
    if (
      !window.confirm(
        "Permanently delete this response? This cannot be undone. Export a CSV first if you need a backup.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/response/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Deletion failed.");
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const shown = useMemo(
    () => (includeDemo ? records : records.filter((r) => !r.isDemo)),
    [records, includeDemo],
  );
  const demoCount = records.filter((r) => r.isDemo).length;
  const priority = distribution(shown, questions[13]).sort(
    (a, b) => b.count - a.count,
  );
  const barriers = distribution(shown, questions[10]).sort(
    (a, b) => b.count - a.count,
  );
  const useful = shown.filter((r) =>
    ["Probably yes", "Definitely yes"].includes(String(r.answers.q15)),
  ).length;
  const veryImportant = shown.filter((r) =>
    ["Very important", "Extremely important"].includes(String(r.answers.q3)),
  ).length;
  const repeatRows = shown.filter((r) => r.possibleRepeat).length;
  const sharedIpGroups = new Set(
    shown.filter((r) => r.possibleRepeat).map((r) => r.ip),
  ).size;
  const themeCounts = themes
    .map((t) => ({
      ...t,
      count: shown.filter((r) =>
        t.words.some((w) =>
          `${r.answers.q19 || ""} ${r.answers.q20 || ""}`
            .toLowerCase()
            .includes(w),
        ),
      ).length,
    }))
    .sort((a, b) => b.count - a.count);
  const unclassified = shown.filter(
    (r) =>
      !themes.some((t) =>
        t.words.some((w) =>
          `${r.answers.q19 || ""} ${r.answers.q20 || ""}`
            .toLowerCase()
            .includes(w),
        ),
      ),
  ).length;
  const filtered = shown.filter(
    (r) =>
      (!onlyRepeat || r.possibleRepeat) &&
      (!query ||
        `${r.id} ${r.ip || ""} ${Object.values(r.answers).flat().join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  return (
    <>
      <SiteHeader active="insights" />
      <main>
          {authenticated === null ? (
            <div className="r-loading">Loading results…</div>
          ) : !authenticated ? (
            <div className="r-gate">
              <div className="r-kicker r-kicker-green">Restricted access</div>
              <h1>
                Insights are for <em className="r-em">your eyes only.</em>
              </h1>
              <p className="r-lead">
                Enter the passcode to view charts, written responses, and the
                complete CSV export. Survey participants cannot see this area.
              </p>
              <form className="r-gate-form" onSubmit={login}>
                <label htmlFor="passcode">Results passcode</label>
                <div className="r-gate-row">
                  <input
                    id="passcode"
                    type="password"
                    autoComplete="current-password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter passcode"
                    required
                  />
                  <button type="submit" className="r-btn r-btn-dark" disabled={busy}>
                    {busy ? "Checking..." : "Unlock results"}{" "}
                    <ArrowRight size={16} />
                  </button>
                </div>
                {error && (
                  <p role="alert" className="r-error">
                    {error}
                  </p>
                )}
              </form>
              <p className="r-gate-note">
                Only someone with the passcode can access these results.
              </p>
              <Link href="/" className="r-back">
                <ArrowLeft size={15} /> Back to home
              </Link>
            </div>
          ) : (
            <div className="r-wrap r-dash">
              <div className="r-dash-head">
                <div>
                  <div className="r-kicker r-kicker-green">
                    Private research dashboard
                  </div>
                  <h1>
                    Survey <em className="r-em">insights.</em>
                  </h1>
                  <p className="r-lead">
                    A clear view of what the IIT community thinks. Sample
                    responses are labelled throughout.
                  </p>
                </div>
                <div className="r-dash-actions">
                  <a href="/api/admin/csv" className="r-btn r-btn-dark r-btn-sm">
                    Export CSV <ArrowDownToLine size={15} />
                  </a>
                  <button
                    className="r-btn r-btn-ghost r-btn-sm"
                    title="Lock results"
                    aria-label="Lock results"
                    onClick={() => action("logout")}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              </div>
              {demoCount === 0 && (
                <div className="r-note-row">
                  <span>No sample records in the database.</span>
                  <button
                    className="r-btn r-btn-ghost r-btn-sm"
                    onClick={() => action("seed")}
                    disabled={busy}
                  >
                    Add 24 sample responses
                  </button>
                </div>
              )}
              <div className="r-tabs" role="tablist">
                {(["overview", "questions", "responses"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    className={tab === t ? "is-active" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t === "overview"
                      ? "Overview"
                      : t === "questions"
                        ? "All questions"
                        : "Responses"}
                  </button>
                ))}
              </div>
              {error && (
                <p className="r-error" role="alert">
                  {error}
                </p>
              )}
              {tab === "overview" && (
                <div>
                  <div className="r-stats">
                    <div className="r-stat">
                      <span>TOTAL RESPONSES</span>
                      <strong>{shown.length}</strong>
                      <small>
                        {includeDemo
                          ? `${demoCount} sample · ${records.length - demoCount} real`
                          : "Real responses only"}
                      </small>
                    </div>
                    <div className="r-stat">
                      <span>SUSTAINABILITY MATTERS</span>
                      <strong>
                        {pct(veryImportant, shown.length)}
                        <em>%</em>
                      </strong>
                      <small>Very or extremely important</small>
                    </div>
                    <div className="r-stat">
                      <span>DIGITAL TOOL INTEREST</span>
                      <strong>
                        {pct(useful, shown.length)}
                        <em>%</em>
                      </strong>
                      <small>Probably or definitely useful</small>
                    </div>
                    <div className="r-stat">
                      <span>SHARED IP RESPONSES</span>
                      <strong>{repeatRows}</strong>
                      <small>
                        {sharedIpGroups} IP group
                        {sharedIpGroups === 1 ? "" : "s"} · review before
                        removing
                      </small>
                    </div>
                  </div>
                  <div className="r-charts">
                    <article className="r-chart">
                      <div className="r-chart-head">
                        <div>
                          <span className="r-kicker">QUESTION 14</span>
                          <h2>First priority for IIT</h2>
                        </div>
                        <span className="r-chip">Single choice</span>
                      </div>
                      <Bars data={priority} total={shown.length} limit={7} />
                    </article>
                    <article className="r-chart">
                      <div className="r-chart-head">
                        <div>
                          <span className="r-kicker">QUESTION 11</span>
                          <h2>Barriers to sustainable action</h2>
                        </div>
                        <span className="r-chip">Multiple choice</span>
                      </div>
                      <Bars data={barriers} total={shown.length} limit={7} />
                      <p className="r-footnote-sm">
                        Each percentage is the share of respondents who selected
                        that option.
                      </p>
                    </article>
                  </div>
                  <article className="r-chart r-themes">
                    <div className="r-chart-head">
                      <div>
                        <span className="r-kicker">
                          WRITTEN ANSWERS · QUESTIONS 19 & 20
                        </span>
                        <h2>Ideas, grouped by theme</h2>
                        <p>
                          Simple keyword grouping. One answer can belong to more
                          than one theme; review the full text for context.
                        </p>
                      </div>
                      <span className="r-chip">Rule-based</span>
                    </div>
                    <div className="r-theme-grid">
                      {themeCounts.map((t) => (
                        <div className="r-theme" key={t.name}>
                          <strong>{t.name}</strong>
                          <span>
                            {t.count} <small>mentions</small>
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="r-footnote-sm">
                      {unclassified} response{unclassified === 1 ? "" : "s"} did
                      not match these themes. This is an exploratory summary,
                      not an AI judgment.
                    </p>
                  </article>
                </div>
              )}
              {tab === "questions" && (
                <div>
                  <div className="r-intro">
                    <span className="r-kicker r-kicker-green">
                      THE COMPLETE BREAKDOWN
                    </span>
                    <h2>Every question, at a glance.</h2>
                    <p>
                      Percentages use {shown.length} visible response
                      {shown.length === 1 ? "" : "s"} as the denominator.
                      Multiple-choice totals can exceed 100%.
                    </p>
                  </div>
                  <div className="r-charts">
                    {questions
                      .filter((q) => q.options)
                      .map((q) => (
                        <article className="r-chart" key={q.id}>
                          <div className="r-chart-head">
                            <div>
                              <span className="r-kicker">
                                QUESTION {q.id.slice(1)}
                              </span>
                              <h3>{q.text}</h3>
                            </div>
                            <span className="r-chip">
                              {q.type === "multi" ? "Multiple" : "Single"}
                            </span>
                          </div>
                          <Bars
                            data={distribution(shown, q).sort(
                              (a, b) => b.count - a.count,
                            )}
                            total={shown.length}
                          />
                        </article>
                      ))}
                  </div>
                </div>
              )}
              {tab === "responses" && (
                <div>
                  <div className="r-intro">
                    <span className="r-kicker r-kicker-green">
                      RESPONSE EXPLORER
                    </span>
                    <h2>Every voice, in full.</h2>
                    <p>
                      IP addresses are visible only here and in the protected
                      CSV. A shared IP is a possible repeat, not proof of a
                      duplicate: campus Wi-Fi and mobile networks can be shared.
                    </p>
                  </div>
                  <div className="r-tools">
                    <input
                      className="r-input r-search"
                      aria-label="Search answers or IP"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search answers or IP..."
                    />
                    <label className={`r-ack r-filter ${onlyRepeat ? "is-checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={onlyRepeat}
                        onChange={(e) => setOnlyRepeat(e.target.checked)}
                      />
                      <span className="r-check">
                        {onlyRepeat && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span>Shared IP only ({repeatRows})</span>
                    </label>
                    <span className="r-count">{filtered.length} responses</span>
                  </div>
                  <div className="r-resp-list">
                    {filtered.length ? (
                      filtered.map((r, i) => (
                        <article className="r-resp" key={r.id}>
                          <button
                            onClick={() =>
                              setSelected(selected === r.id ? null : r.id)
                            }
                            aria-expanded={selected === r.id}
                          >
                            <span className="r-resp-num">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="r-resp-main">
                              <strong>Response {r.id.slice(0, 8)}</strong>
                              <small>
                                {new Date(r.createdAt).toLocaleString()} ·{" "}
                                {r.answers.q1} · IP {r.ip || "unavailable"}
                              </small>
                            </span>
                            {r.possibleRepeat && (
                              <span className="r-pill">SHARED IP</span>
                            )}
                            {selected === r.id ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                          {selected === r.id && (
                            <div className="r-resp-detail">
                              <div className="r-resp-ip">
                                <span>VISITOR IP ADDRESS</span>
                                <p>
                                  {r.ip ||
                                    "Unavailable (older response or missing edge header)"}
                                </p>
                              </div>
                              {questions.map((q) => (
                                <div key={q.id}>
                                  <span>
                                    {q.id.toUpperCase()} · {q.text}
                                  </span>
                                  <p>
                                    {Array.isArray(r.answers[q.id])
                                      ? (r.answers[q.id] as string[])
                                          .map((v) =>
                                            v === "Other"
                                              ? `Other: ${r.answers[`${q.id}_other`] || ""}`
                                              : v,
                                          )
                                          .join(" · ")
                                      : r.answers[q.id] === "Other"
                                        ? `Other: ${r.answers[`${q.id}_other`] || ""}`
                                        : String(r.answers[q.id] || "—")}
                                  </p>
                                </div>
                              ))}
                              <div className="r-resp-delete">
                                <button
                                  className="r-btn r-btn-ghost r-btn-sm r-btn-danger"
                                  disabled={busy}
                                  onClick={() => deleteResponse(r.id)}
                                >
                                  Delete this response
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      ))
                    ) : (
                      <div className="r-empty-box">
                        No matching responses yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="r-dash-foot">
                <span>Results are passcode protected</span>
                <span>
                  Academic coursework project · IIT Sustainability Survey
                </span>
              </div>
            </div>
          )}
      </main>
      <SiteFooter />
    </>
  );
}
