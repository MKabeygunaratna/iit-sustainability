"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Eye, Leaf, LockKeyhole, LogOut, RotateCcw, Search, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import { questions, type Answers, type Question } from "../../lib/questions";

type RecordItem = { id: string; createdAt: string; isDemo: boolean; ip: string | null; possibleRepeat: boolean; answers: Answers };
type Tab = "overview" | "questions" | "responses";
const themes: { name: string; words: string[]; color: string }[] = [
  { name: "Recycling & waste", words: ["recycl", "waste", "bin", "litter", "compost"], color: "#60b89b" },
  { name: "Energy & solar", words: ["energ", "electric", "solar", "light", "power"], color: "#d6a355" },
  { name: "Water", words: ["water", "tap", "leak"], color: "#63a8c7" },
  { name: "Plastic", words: ["plastic", "reus", "refill", "bottle"], color: "#b599db" },
  { name: "Awareness & participation", words: ["aware", "workshop", "promot", "student", "volunteer", "event", "educat"], color: "#e18785" },
  { name: "Digital & reporting", words: ["digital", "dashboard", "portal", "online", "progress", "report", "app"], color: "#8a9dd8" },
  { name: "Green spaces", words: ["green", "plant", "tree", "garden"], color: "#91b85d" },
  { name: "Electronic waste", words: ["e-waste", "electronic", "device", "computer"], color: "#a9a185" },
];
const pct = (count: number, total: number) => total ? Math.round(count / total * 100) : 0;
function distribution(data: RecordItem[], q: Question) {
  return q.options?.map(option => ({ label: option, count: data.filter(r => Array.isArray(r.answers[q.id]) ? (r.answers[q.id] as string[]).includes(option) : r.answers[q.id] === option).length })) || [];
}
function Bars({ data, total, limit = 20 }: { data: {label:string;count:number}[]; total:number; limit?:number }) {
  return <div className="bar-list">{data.slice(0, limit).map(item => <div className="bar-row" key={item.label}><div className="bar-copy"><span>{item.label}</span><strong>{pct(item.count,total)}% <small>({item.count})</small></strong></div><div className="bar-track"><div style={{ width: `${pct(item.count,total)}%` }}/></div></div>)}{!total && <p className="empty-small">No responses to display yet.</p>}</div>;
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
  const load = useCallback(async () => { const res = await fetch("/api/admin/data", { cache: "no-store" }); if (res.ok) { const data = await res.json() as { responses: RecordItem[] }; setRecords(data.responses); setAuthenticated(true); } else setAuthenticated(false); }, []);
  useEffect(() => { fetch("/api/admin/session", { cache: "no-store" }).then(r => r.json() as Promise<{authenticated:boolean}>).then(d => d.authenticated ? load() : setAuthenticated(false)).catch(() => setAuthenticated(false)); }, [load]);
  async function login(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) }); const data = await res.json() as {error?:string}; if (!res.ok) throw new Error(data.error); setPasscode(""); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Could not unlock results."); } finally { setBusy(false); } }
  async function action(name: "seed" | "clear-demo" | "logout") { setBusy(true); setError(""); try { const res = await fetch(`/api/admin/${name}`, { method: "POST" }); const data = await res.json() as {error?:string}; if (!res.ok) throw new Error(data.error || "Action failed."); if (name === "logout") { setAuthenticated(false); setRecords([]); } else await load(); } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); } finally { setBusy(false); } }
  async function deleteResponse(id: string) {
    if (!window.confirm("Permanently delete this response? This cannot be undone. Export a CSV first if you need a backup.")) return;
    setBusy(true); setError("");
    try { const res = await fetch(`/api/admin/response/${id}`, { method: "DELETE" }); const data = await res.json() as { error?: string }; if (!res.ok) throw new Error(data.error || "Deletion failed."); setSelected(null); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  const shown = useMemo(() => includeDemo ? records : records.filter(r => !r.isDemo), [records, includeDemo]);
  const demoCount = records.filter(r => r.isDemo).length;
  const priority = distribution(shown, questions[13]).sort((a,b) => b.count-a.count);
  const barriers = distribution(shown, questions[10]).sort((a,b) => b.count-a.count);
  const useful = shown.filter(r => ["Probably yes", "Definitely yes"].includes(String(r.answers.q15))).length;
  const veryImportant = shown.filter(r => ["Very important", "Extremely important"].includes(String(r.answers.q3))).length;
  const repeatRows = shown.filter(r => r.possibleRepeat).length;
  const sharedIpGroups = new Set(shown.filter(r => r.possibleRepeat).map(r => r.ip)).size;
  const themeCounts = themes.map(t => ({ ...t, count: shown.filter(r => t.words.some(w => `${r.answers.q19 || ""} ${r.answers.q20 || ""}`.toLowerCase().includes(w))).length })).sort((a,b) => b.count-a.count);
  const unclassified = shown.filter(r => !themes.some(t => t.words.some(w => `${r.answers.q19 || ""} ${r.answers.q20 || ""}`.toLowerCase().includes(w)))).length;
  const filtered = shown.filter(r => (!onlyRepeat || r.possibleRepeat) && (!query || `${r.id} ${r.ip || ""} ${Object.values(r.answers).flat().join(" ")}`.toLowerCase().includes(query.toLowerCase())));
  return <><SiteHeader active="insights"/><main className="insights-shell"><div className="container">
    {authenticated === null ? <div className="loading-view">Loading results…</div> : !authenticated ? <div className="gate-wrap"><div className="gate-orb"><LockKeyhole size={38}/></div><div className="eyebrow"><span className="live-dot"/> RESTRICTED ACCESS</div><h1>Insights are for<br/><em>your eyes only.</em></h1><p>Enter the passcode to view charts, written responses, and the complete CSV export. Survey participants cannot see this area.</p><form className="gate-form" onSubmit={login}><label htmlFor="passcode">Results passcode</label><div className="password-row"><input id="passcode" type="password" autoComplete="current-password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="Enter passcode" required/><button type="submit" disabled={busy}>{busy ? "Checking..." : "Unlock results"} <ArrowRight size={17}/></button></div>{error && <span role="alert" className="form-error">{error}</span>}</form><div className="gate-note"><ShieldCheck size={17}/> Only someone with the passcode can access these results.</div><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to home</Link></div> : <>
      <div className="dashboard-hero"><div><div className="eyebrow"><span className="live-dot"/> PRIVATE RESEARCH DASHBOARD</div><h1>Survey <em>insights.</em></h1><p>A clear view of what the IIT community thinks. Sample responses are labelled throughout.</p></div><div className="dashboard-actions"><a href="/api/admin/csv" className="btn btn-primary"><ArrowDownToLine size={17}/> Export CSV</a><button className="icon-button" title="Lock results" onClick={() => action("logout")}><LogOut size={19}/></button></div></div>
      {demoCount === 0 && <div className="data-toolbar"><span><CheckCircle2 size={17}/> No sample records in the database.</span><button onClick={() => action("seed")} disabled={busy}><RotateCcw size={15}/> Add 24 sample responses</button></div>}
      <div className="dashboard-tabs"><div>{(["overview", "questions", "responses"] as Tab[]).map((t,i)=><button key={t} className={tab===t ? "selected" : ""} onClick={() => setTab(t)}>{[<BarChart3 size={16} key="a"/>,<Eye size={16} key="b"/>,<Leaf size={16} key="c"/>][i]}{t === "overview" ? "Overview" : t === "questions" ? "All questions" : "Responses"}</button>)}</div><label className="toggle-demos"><input type="checkbox" checked={includeDemo} onChange={e => setIncludeDemo(e.target.checked)}/> Include sample data</label></div>
      {error && <p className="form-error dashboard-error" role="alert">{error}</p>}
      {tab === "overview" && <div className="dashboard-content"><div className="stat-grid"><div className="stat-card"><span>TOTAL RESPONSES</span><strong>{shown.length}</strong><small>{includeDemo ? `${demoCount} sample · ${records.length-demoCount} real` : "Real responses only"}</small></div><div className="stat-card"><span>SUSTAINABILITY MATTERS</span><strong>{pct(veryImportant,shown.length)}<em>%</em></strong><small>Very or extremely important</small></div><div className="stat-card"><span>DIGITAL TOOL INTEREST</span><strong>{pct(useful,shown.length)}<em>%</em></strong><small>Probably or definitely useful</small></div><div className="stat-card accent"><span>SHARED IP RESPONSES</span><strong>{repeatRows}</strong><small>{sharedIpGroups} IP group{sharedIpGroups===1?"":"s"} · review before removing</small></div></div>
        <div className="chart-grid"><article className="chart-card"><div className="chart-heading"><div><span className="section-kicker">QUESTION 14</span><h2>First priority for IIT</h2></div><span className="chart-chip">Single choice</span></div><Bars data={priority} total={shown.length} limit={7}/></article><article className="chart-card"><div className="chart-heading"><div><span className="section-kicker">QUESTION 11</span><h2>Barriers to sustainable action</h2></div><span className="chart-chip">Multiple choice</span></div><Bars data={barriers} total={shown.length} limit={7}/><p className="chart-footnote">Each percentage is the share of respondents who selected that option.</p></article></div>
        <div className="themes-card"><div className="chart-heading"><div><span className="section-kicker">WRITTEN ANSWERS · QUESTIONS 19 & 20</span><h2>Ideas, grouped by theme</h2><p>Simple keyword grouping. One answer can belong to more than one theme; review the full text for context.</p></div><span className="chart-chip">Rule-based</span></div><div className="theme-grid">{themeCounts.map(t => <div className="theme-item" key={t.name}><span className="theme-dot" style={{background:t.color}}/><strong>{t.name}</strong><span>{t.count} <small>mentions</small></span></div>)}</div><p className="chart-footnote">{unclassified} response{unclassified===1?"":"s"} did not match these themes. This is an exploratory summary, not an AI judgment.</p></div></div>}
      {tab === "questions" && <div className="all-questions"><div className="tab-intro"><span className="section-kicker">THE COMPLETE BREAKDOWN</span><h2>Every question, at a glance.</h2><p>Percentages use {shown.length} visible response{shown.length===1?"":"s"} as the denominator. Multiple-choice totals can exceed 100%.</p></div><div className="question-chart-grid">{questions.filter(q => q.options).map(q => <article className="chart-card" key={q.id}><div className="chart-heading"><div><span className="section-kicker">QUESTION {q.id.slice(1)}</span><h3>{q.text}</h3></div><span className="chart-chip">{q.type === "multi" ? "Multiple" : "Single"}</span></div><Bars data={distribution(shown,q).sort((a,b)=>b.count-a.count)} total={shown.length}/></article>)}</div></div>}
      {tab === "responses" && <div className="responses-view"><div className="tab-intro"><span className="section-kicker">RESPONSE EXPLORER</span><h2>Every voice, in full.</h2><p>IP addresses are visible only here and in the protected CSV. A shared IP is a possible repeat, not proof of a duplicate: campus Wi-Fi and mobile networks can be shared.</p></div><div className="response-tools"><label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search answers or IP..."/></label><label className="repeat-filter"><input type="checkbox" checked={onlyRepeat} onChange={e=>setOnlyRepeat(e.target.checked)}/> Shared IP only ({repeatRows})</label><span>{filtered.length} responses</span></div><div className="response-list">{filtered.length ? filtered.map((r,i)=><article className="response-item" key={r.id}><button onClick={() => setSelected(selected === r.id ? null : r.id)} aria-expanded={selected === r.id}><span className="response-avatar">{String(i+1).padStart(2,"0")}</span><span className="response-main"><strong>Response {r.id.slice(0,8)}</strong><small>{new Date(r.createdAt).toLocaleString()} · {r.answers.q1} · IP {r.ip || "unavailable"}</small></span>{r.isDemo && <span className="sample-pill">SAMPLE</span>}{r.possibleRepeat && <span className="repeat-pill">SHARED IP</span>}{selected===r.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>{selected===r.id && <div className="response-detail"><div className="response-ip"><span>VISITOR IP ADDRESS</span><p>{r.ip || "Unavailable (older response or missing edge header)"}</p></div>{questions.map(q=><div key={q.id}><span>{q.id.toUpperCase()} · {q.text}</span><p>{Array.isArray(r.answers[q.id]) ? (r.answers[q.id] as string[]).map(v=>v === "Other" ? `Other: ${r.answers[`${q.id}_other`] || ""}` : v).join(" · ") : r.answers[q.id] === "Other" ? `Other: ${r.answers[`${q.id}_other`] || ""}` : String(r.answers[q.id] || "—")}</p></div>)}<div className="response-delete"><button disabled={busy} onClick={() => deleteResponse(r.id)}><Trash2 size={14}/> Delete this response</button></div></div>}</article>) : <div className="empty-responses">No matching responses yet.</div>}</div></div>}
      <div className="dashboard-footer"><span><LockKeyhole size={14}/> Results are passcode protected</span><span>Academic coursework project · IIT Sustainability Survey</span></div>
    </>}
  </div></main></>;
}
