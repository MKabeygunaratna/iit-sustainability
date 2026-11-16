import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export default function SiteFooter() {
  return <footer className="r-footer"><div className="r-wrap r-footer-inner"><div className="r-footer-brand"><Image src="/logo.png" width={22} height={22} alt="IIT crest"/><strong>IIT.</strong><span>Sustainability Survey</span></div><p style={{ margin: 0 }}>Academic coursework project · Independent survey about IIT sustainability</p><Link href="/insights">Protected results <ArrowUpRight size={13}/></Link></div><div className="r-wrap r-footer-note">IIT is used to identify the subject of this student survey. This site is not presented as an official IIT publication.</div></footer>;
}
