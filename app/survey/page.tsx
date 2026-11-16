"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Leaf, LockKeyhole, ShieldCheck } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import { sections, type Answers, type Question } from "../../lib/questions";

export default function SurveyPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [acknowledgedIp, setAcknowledgedIp] = useState(false);
  const section = sections[step];
  function update(id: string, value: string | string[]) { setAnswers(a => ({ ...a, [id]: value })); setError(""); }
  function toggle(q: Question, value: string) {
    const old = Array.isArray(answers[q.id]) ? answers[q.id] as string[] : [];
    let next = old.includes(value) ? old.filter(x => x !== value) : [...old, value];
    if (q.id === "q11") next = value === "None" ? (old.includes("None") ? [] : ["None"]) : next.filter(x => x !== "None");
    if (q.max && next.length > q.max) { setError(`Choose up to ${q.max} options for this question.`); return; }
    update(q.id, next);
  }
  function validateStep() {
    for (const q of section.questions) {
      const answer = answers[q.id];
      if (!q.optional && (!answer || (Array.isArray(answer) && !answer.length) || (typeof answer === "string" && !answer.trim()))) { setError(`Please answer question ${q.id.slice(1)} before continuing.`); document.getElementById(q.id)?.scrollIntoView({ behavior: "smooth", block: "center" }); return false; }
      if (q.options?.includes("Other") && (Array.isArray(answer) ? answer.includes("Other") : answer === "Other") && !String(answers[`${q.id}_other`] || "").trim()) { setError(`Please specify “Other” for question ${q.id.slice(1)}.`); document.getElementById(q.id)?.scrollIntoView({ behavior: "smooth", block: "center" }); return false; }
    }
    return true;
  }
  async function next() {
    if (!validateStep()) return;
    if (step < sections.length - 1) { setStep(step + 1); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (!acknowledgedIp) { setError("Please acknowledge the IP address notice before submitting."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, website: "", acknowledgedIp }) });
      const result = await res.json() as {error?:string};
      if (!res.ok) throw new Error(result.error || "Submission failed.");
      setDone(true); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <><SiteHeader active="survey"/><main className="survey-shell"><div className="survey-decoration"/><div className="container survey-container">
    {done ? <div className="thankyou-card"><div className="thankyou-icon"><CheckCircle2 size={50}/></div><span className="section-kicker">RESPONSE RECEIVED</span><h1>Thank you for<br/><em>sharing your voice.</em></h1><p>Your response has been saved with its encrypted IP address for possible repeat review. Your perspective helps build a clearer picture of sustainability at IIT.</p><Link href="/" className="btn btn-primary">Back to homepage <ArrowRight size={18}/></Link></div> : <>
      <div className="survey-topline"><Link href="/" className="back-link"><ArrowLeft size={17}/> Back to home</Link><span><LockKeyhole size={15}/> Answers & IP encrypted</span></div>
      <div className="survey-title"><div className="eyebrow"><span className="live-dot"/> IIT SUSTAINABILITY SURVEY</div><h1>Your perspective<br/><em>makes a difference.</em></h1><p>There are no right or wrong answers. Please respond based on your own experience at IIT.</p><div className="privacy-notice"><ShieldCheck size={18}/><span>Privacy notice: This survey records your IP address to flag possible repeat responses. Your IP and answers are encrypted. We do not ask for your name, email, or student ID.</span></div></div>
      <div className="survey-progress"><div className="progress-header"><span>SECTION {String(step+1).padStart(2,"0")} OF 05</span><strong>{Math.round((step / sections.length) * 100)}% complete</strong></div><div className="progress-track"><div style={{ width: `${(step / sections.length) * 100}%` }}/></div><div className="progress-labels">{sections.map((s,i)=><button type="button" key={s.label} aria-label={`Section ${i + 1}: ${s.label}`} aria-current={i === step ? "step" : undefined} className={i === step ? "current" : i < step ? "visited" : ""} onClick={() => { if (i < step) { setStep(i); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); } }} disabled={i > step}><span>{i < step ? <Check size={12}/> : i+1}</span><small>{s.label}</small></button>)}</div></div>
      <div className="question-panel"><div className="panel-head"><span className="section-kicker">{section.eyebrow}</span><h2>{section.label}</h2><p>{step === 0 ? "A little context helps us understand the range of perspectives." : step === 4 ? "Think about the tools and ideas that could support positive change." : "Choose the response that best reflects your view."}</p></div>
        <div className="questions">{section.questions.map(q => { const value = answers[q.id]; const otherSelected = q.options?.includes("Other") && (Array.isArray(value) ? value.includes("Other") : value === "Other"); return <fieldset id={q.id} className="question" key={q.id}><legend><span className="question-index">{q.id.slice(1).padStart(2,"0")}</span><span>{q.text}{q.optional && <small> (Optional)</small>}</span></legend>{q.type === "multi" && <p className="question-hint">{q.max ? `Select up to ${q.max}` : "Select all that apply"}{q.max && Array.isArray(value) ? ` · ${value.length}/${q.max} chosen` : ""}</p>}
          {q.type === "text" ? <textarea value={typeof value === "string" ? value : ""} maxLength={600} onChange={e => update(q.id, e.target.value)} placeholder={q.optional ? "Anything else you'd like to share?" : "Share one practical idea..."} rows={4}/> : <div className="option-grid">{q.options?.map(option => { const selected = Array.isArray(value) ? value.includes(option) : value === option; return <label className={`option ${selected ? "selected" : ""}`} key={option}><input type={q.type === "multi" ? "checkbox" : "radio"} name={q.id} checked={selected} onChange={() => q.type === "multi" ? toggle(q, option) : update(q.id, option)}/><span className="option-indicator">{selected && <Check size={13} strokeWidth={3}/>}</span><span>{option}</span></label>; })}</div>}
          {otherSelected && <input className="other-input" aria-label={`Specify other for question ${q.id.slice(1)}`} value={String(answers[`${q.id}_other`] || "")} onChange={e => update(`${q.id}_other`, e.target.value)} maxLength={120} placeholder="Please specify..."/>}
        </fieldset>; })}</div>
        {step === 4 && <label className="ip-acknowledgement"><input type="checkbox" checked={acknowledgedIp} onChange={e=>setAcknowledgedIp(e.target.checked)}/><span>I understand that my IP address will be collected, encrypted, and used to flag possible repeat responses for this academic survey.</span></label>}
        <div className="survey-controls">{error && <p role="alert" className="form-error">{error}</p>}<div className="control-row"><button className="btn btn-outline" type="button" disabled={step === 0 || busy} onClick={() => { setStep(step-1); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ArrowLeft size={17}/> Previous</button><button className="btn btn-primary" type="button" disabled={busy} onClick={next}>{busy ? "Saving..." : step === 4 ? "Submit response" : "Continue"} {!busy && <ArrowRight size={18}/>}</button></div></div>
      </div><p className="survey-privacy"><Leaf size={18}/> We record IP addresses for possible repeat review and encrypt them with survey answers. An IP may be shared by several people; matches are never removed automatically. Please avoid names, emails, or student IDs in written answers.</p>
    </>}
  </div></main></>;
}
