import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export default function SiteHeader({ active }: { active?: "survey" | "insights" }) {
  return <header className="r-header"><div className="r-wrap r-header-inner">
    <Link href="/" className="r-brand" aria-label="IIT Sustainability Survey home"><Image src="/logo.png" width={30} height={30} alt="IIT crest" priority/><span className="r-brand-text"><strong>IIT<span>.</span></strong><small>Sustainability Survey</small></span></Link>
    <nav className="r-nav" aria-label="Main navigation">
      <div className="r-nav-links"><Link href="/" aria-current={!active ? "page" : undefined}>Home</Link><Link href="/survey" aria-current={active === "survey" ? "page" : undefined}>The survey</Link><Link href="/insights" aria-current={active === "insights" ? "page" : undefined}>Results</Link></div>
      <Link className="r-btn r-btn-dark r-btn-sm" href="/survey">Take the survey <ArrowUpRight size={15}/></Link>
    </nav>
  </div></header>;
}
