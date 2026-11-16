import Link from "next/link";
import { ArrowUpRight, Leaf } from "lucide-react";

export default function SiteHeader({ active }: { active?: "survey" | "insights" }) {
  return <header className="site-header"><div className="container header-inner">
    <Link href="/" className="brand" aria-label="IIT Sustainability Survey home"><span className="brand-mark"><Leaf size={18} strokeWidth={2.4}/></span><span className="brand-text"><strong>IIT<span className="brand-dot">.</span></strong><small>SUSTAINABILITY SURVEY</small></span></Link>
    <nav className="nav-links" aria-label="Main navigation"><Link href="/" className={!active ? "active" : ""}>Home</Link><Link href="/survey" className={active === "survey" ? "active" : ""}>The survey</Link><Link href="/insights" className={active === "insights" ? "active" : ""}>Results <ArrowUpRight size={13}/></Link></nav>
    <Link className="header-cta" href="/survey">Take the survey <ArrowUpRight size={16}/></Link>
  </div></header>;
}
