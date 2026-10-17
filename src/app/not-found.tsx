import Link from "next/link";
export default function NotFound() { return <main id="main" className="not-found"><p className="eyebrow">404</p><h1>Signal lost.</h1><p>The route did not resolve, but the rest of the field is still here.</p><Link href="/">Return home</Link></main>; }
