import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import { initializeDemo } from "../lib/demo";

export const dynamic = "force-dynamic";
export default async function Home() {
  await initializeDemo();
  return <><SiteHeader/><main>
    <section className="r-wrap r-hero">
      <div className="r-kicker"><span className="r-dot"/> An academic research survey · IIT community</div>
      <h1>A greener campus starts with <em className="r-em">your voice.</em></h1>
      <p className="r-hero-sub">What is working? What could be better? Share your perspective on sustainability at IIT and help identify the ideas that matter most.</p>
      <div className="r-hero-actions"><Link href="/survey" className="r-btn r-btn-green">Take the survey <ArrowRight size={17}/></Link><span className="r-time">About 5–7 minutes · 20 questions</span></div>
      <ul className="r-trust"><li>No name or email requested</li><li>Encrypted answers &amp; IP</li><li>Academic use only</li></ul>
    </section>
    <section className="r-band" id="why"><div className="r-wrap r-section">
      <div className="r-split r-split-end"><div><span className="r-kicker">The big picture</span><h2 className="r-h2">Small actions. Meaningful change.</h2></div><p className="r-lead">This is a space to share honest views about sustainability on campus. Your answers can help highlight where attention is needed.</p></div>
      <div className="r-features">
        <article className="r-feature"><span>01 / UNDERSTAND</span><h3>Where we stand</h3><p>Tell us how you see IIT’s current environmental efforts, from waste disposal to energy and water use.</p></article>
        <article className="r-feature"><span>02 / IMPROVE</span><h3>What matters most</h3><p>Point to the barriers you notice and choose the changes you think IIT should prioritise next.</p></article>
        <article className="r-feature"><span>03 / IMAGINE</span><h3>What comes next</h3><p>Share how digital tools and new ideas could make sustainable choices easier for everyone.</p></article>
      </div>
    </div></section>
    <section className="r-wrap r-section r-split r-split-center" aria-labelledby="sdg-heading">
      <div><span className="r-kicker">Local voices. Global goals.</span><h2 className="r-h2" id="sdg-heading">A better campus. <em className="r-em">A bigger purpose.</em></h2><p className="r-lead" style={{ marginTop: 20 }}>From the water we use to the waste we create, everyday campus choices connect to the Sustainable Development Goals. Your perspective can help identify where IIT could take its next step.</p>
        <div className="r-goals"><span className="r-goal"><b>06</b> Clean water</span><span className="r-goal"><b>07</b> Clean energy</span><span className="r-goal"><b>12</b> Responsible consumption</span><span className="r-goal"><b>13</b> Climate action</span></div>
        <Link href="/survey" className="r-link">Bring your ideas to the survey <ArrowRight size={16}/></Link>
      </div>
      <figure className="r-figure"><Image src="/sdg.png" width={659} height={465} sizes="(max-width: 760px) 90vw, 520px" alt="The 17 Sustainable Development Goals, covering people, the planet, and shared prosperity"/><figcaption>A global framework. A place to start on campus.</figcaption></figure>
    </section>
    <section className="r-band"><div className="r-wrap r-section r-split r-split-center">
      <div><span className="r-kicker">How it works</span><h2 className="r-h2">Five short sections. <em className="r-em">One useful perspective.</em></h2><p className="r-lead" style={{ margin: "20px 0 28px" }}>Choose the answers that reflect your experience. The last section gives you room to share your own ideas in your own words.</p><Link href="/survey" className="r-link">Start answering <ArrowRight size={16}/></Link></div>
      <ol className="r-steps">{["About you", "Awareness", "Current situation", "Problems & priorities", "Digital future"].map((item,i)=><li key={item}><span>0{i+1}</span><strong>{item}</strong></li>)}</ol>
    </div></section>
    <section className="r-wrap r-section"><div className="r-privacy"><span className="r-kicker">Your privacy matters</span><h2>Your data, handled carefully.</h2><p className="r-lead">We do not ask for your name, email, or student ID. We do collect your IP address to flag possible repeat responses. Your IP and answers are encrypted before storage and sent over HTTPS. Only the passcode holder can review them for this academic project. Please avoid identifying details in written answers.</p></div></section>
    <section className="r-cta"><div className="r-wrap r-cta-inner"><div><span className="r-kicker">Ready when you are</span><h2>Help shape a more <em className="r-em">sustainable IIT.</em></h2></div><Link className="r-btn r-btn-light" href="/survey">Take the survey <ArrowUpRight size={17}/></Link></div></section>
  </main><SiteFooter/></>;
}
