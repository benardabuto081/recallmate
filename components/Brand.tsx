import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight text-slate-900" aria-label="RecallMate home">
      <span aria-hidden className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">R</span>
      <span className="text-lg">RecallMate</span>
    </Link>
  );
}
