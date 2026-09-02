import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-4xl">Not found</h1>
      <p className="text-ink-muted">That page is not part of the ELI Outreach console.</p>
      <Link href="/" className="underline">
        Back to Today
      </Link>
    </div>
  );
}
