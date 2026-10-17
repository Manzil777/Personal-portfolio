import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/data/site";

export function generateStaticParams() { return projects.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const project = projects.find((item) => item.slug === slug); return project ? { title: project.title, description: project.summary } : {}; }
export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const index = projects.findIndex((item) => item.slug === slug); if (index < 0) notFound(); const project = projects[index]; const next = projects[(index + 1) % projects.length]; return <article className="case"><Link className="back" href="/">← Home</Link><header className="case-hero"><p>{project.year} · {project.stack.join(" · ")}</p><h1>{project.title}</h1><p className="case-summary">{project.summary}</p><div className="case-signal" aria-hidden="true">{project.shape}</div></header><div className="case-body">{project.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.text}</p></section>)}</div><Link className="next-project" href={`/work/${next.slug}`}>Next project <span>{next.title} →</span></Link></article>; }
