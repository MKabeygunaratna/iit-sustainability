"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { sections, type Answers, type Question } from "../../lib/questions";

export default function SurveyPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
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
      const result = await res.json() as {error?:string; code?:string};
      if (result.code === "SURVEY_CLOSED") {
        setClosed(true); window.scrollTo({ top: 0, behavior: "smooth" }); return;
      }
      if (!res.ok) throw new Error(result.error || "Submission failed.");
      setError("This survey is no longer accepting responses. Your response has not been saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <><SiteHeader active="survey"/><main className="r-wrap r-narrow r-survey">
    {closed ? <div className="r-thanks" role="status"><span className="r-kicker r-kicker-green">Survey closed</span><h1>Response collection <em className="r-em">has ended.</em></h1><p>This survey is no longer accepting responses. Your response has not been saved. Thank you for your interest in sustainability at IIT.</p><Link href="/" className="r-btn r-btn-green">Back to homepage <ArrowRight size={17}/></Link></div> : <>
      <div className="r-topline"><Link href="/" className="r-back"><ArrowLeft size={15}/> Back to home</Link><span><LockKeyhole size={14}/> Answers & IP encrypted</span></div>
      <h1 className="r-title">Your perspective <em className="r-em">makes a difference.</em></h1>
      <p className="r-lead">There are no right or wrong answers. Please respond based on your own experience at IIT.</p>
      <p className="r-notice">Privacy notice: This survey records your IP address to flag possible repeat responses. Your IP and answers are encrypted. We do not ask for your name, email, or student ID.</p>
      <div className="r-progress"><div className="r-progress-head"><span>Section {String(step+1).padStart(2,"0")} of 05</span><strong style={{ fontWeight: 400 }}>{Math.round((step / sections.length) * 100)}% complete</strong></div><div className="r-progress-steps">{sections.map((s,i)=><button type="button" key={s.label} aria-label={`Section ${i + 1}: ${s.label}`} aria-current={i === step ? "step" : undefined} className={i === step ? "is-current" : i < step ? "is-visited" : ""} onClick={() => { if (i < step) { setStep(i); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); } }} disabled={i > step}><i/><small>{s.label}</small></button>)}</div></div>
      <div className="r-section-head"><span className="r-kicker r-kicker-green">{section.eyebrow}</span><h2>{section.label}</h2><p>{step === 0 ? "A little context helps us understand the range of perspectives." : step === 4 ? "Think about the tools and ideas that could support positive change." : "Choose the response that best reflects your view."}</p></div>
      <div className="r-questions" key={step}>{section.questions.map(q => { const value = answers[q.id]; const otherSelected = q.options?.includes("Other") && (Array.isArray(value) ? value.includes("Other") : value === "Other"); return <fieldset id={q.id} className="r-question" key={q.id}><legend><span>{q.id.slice(1).padStart(2,"0")}</span><span>{q.text}{q.optional && <small> (Optional)</small>}</span></legend><div className="r-question-body">{q.type === "multi" && <p className="r-hint">{q.max ? `Select up to ${q.max}` : "Select all that apply"}{q.max && Array.isArray(value) ? ` · ${value.length}/${q.max} chosen` : ""}</p>}
          {q.type === "text" ? <textarea className="r-textarea" value={typeof value === "string" ? value : ""} maxLength={600} onChange={e => update(q.id, e.target.value)} placeholder={q.optional ? "Anything else you'd like to share?" : "Share one practical idea..."} rows={4}/> : <div className="r-options">{q.options?.map(option => { const selected = Array.isArray(value) ? value.includes(option) : value === option; return <label className={`r-option ${q.type === "multi" ? "is-multi" : ""} ${selected ? "is-selected" : ""}`} key={option}><input type={q.type === "multi" ? "checkbox" : "radio"} name={q.id} checked={selected} onChange={() => q.type === "multi" ? toggle(q, option) : update(q.id, option)}/><span className="r-check">{selected && <Check size={12} strokeWidth={3}/>}</span><span>{option}</span></label>; })}</div>}
          {otherSelected && <input className="r-input" aria-label={`Specify other for question ${q.id.slice(1)}`} value={String(answers[`${q.id}_other`] || "")} onChange={e => update(`${q.id}_other`, e.target.value)} maxLength={120} placeholder="Please specify..."/>}
        </div></fieldset>; })}</div>
      {step === 4 && <label className={`r-ack ${acknowledgedIp ? "is-checked" : ""}`}><input type="checkbox" checked={acknowledgedIp} onChange={e=>setAcknowledgedIp(e.target.checked)}/><span className="r-check">{acknowledgedIp && <Check size={12} strokeWidth={3}/>}</span><span>I understand that my IP address will be collected, encrypted, and used to flag possible repeat responses for this academic survey.</span></label>}
      {error && <p role="alert" className="r-error">{error}</p>}
      <div className="r-controls"><button className="r-btn r-btn-ghost" type="button" disabled={step === 0 || busy} onClick={() => { setStep(step-1); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ArrowLeft size={16}/> Previous</button><button className="r-btn r-btn-green" type="button" disabled={busy} onClick={next}>{busy ? "Saving..." : step === 4 ? "Submit response" : "Continue"} {!busy && <ArrowRight size={17}/>}</button></div>
      <p className="r-footnote">We record IP addresses for possible repeat review and encrypt them with survey answers. An IP may be shared by several people; matches are never removed automatically. Please avoid names, emails, or student IDs in written answers.</p>
    </>}
  </main><SiteFooter/></>;
}
