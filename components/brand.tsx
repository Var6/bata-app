import Link from "next/link";

/** Bata script wordmark. */
export function BataLogo({ light = false, className = "h-7 w-auto" }: { light?: boolean; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={light ? "/bata-logo-white.svg" : "/bata-logo.svg"} alt="Bata" className={className} />;
}

/** Bata Children's Program lock-up. Use `light` on dark backgrounds. */
export function BcpLogo({ light = false, className = "h-10 w-auto" }: { light?: boolean; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={light ? "/bcp-logo-white.png" : "/bcp-logo.png"}
      alt="Bata Children's Program — Giving children a step ahead"
      className={className}
    />
  );
}

/** The colourful BCP mark on its own, for tight spaces. */
export function BcpMark({ className = "h-8 w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/bcp-mark.png" alt="" className={className} />;
}

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
    <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 007.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 015.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.2.67.8.56A11.5 11.5 0 0023.5 12C23.5 5.73 18.27.5 12 .5z" />
  </svg>
);

/**
 * Site footer — Janman People's Foundation credit, with janmanindia.org on the
 * left and the developer's GitHub on the right.
 */
export function SiteFooter({ dark = true }: { dark?: boolean }) {
  const base = dark
    ? "border-zinc-800 bg-zinc-950 text-zinc-400"
    : "border-zinc-200 bg-white text-zinc-500";
  const linkCls = dark
    ? "text-zinc-300 transition hover:text-white"
    : "text-zinc-700 transition hover:text-bata-700";

  return (
    <footer className={`border-t ${base}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-center gap-6">
          <BataLogo light={dark} className="h-6 w-auto opacity-90" />
          <span className={dark ? "h-6 w-px bg-zinc-700" : "h-6 w-px bg-zinc-200"} />
          <BcpLogo light={dark} className="h-9 w-auto opacity-90" />
        </div>

        <div className="flex w-full flex-col items-center gap-3 border-t border-current/10 pt-6 sm:flex-row sm:justify-between">
          <a
            href="https://janmanindia.org"
            target="_blank"
            rel="noreferrer noopener"
            className={`text-sm font-medium ${linkCls}`}
          >
            janmanindia.org
          </a>

          <p className="order-first text-center text-xs sm:order-none">
            Developed by{" "}
            <a
              href="https://janmanindia.org"
              target="_blank"
              rel="noreferrer noopener"
              className={`font-semibold ${linkCls}`}
            >
              Janman People&apos;s Foundation
            </a>
          </p>

          <a
            href="https://github.com/Var6"
            target="_blank"
            rel="noreferrer noopener"
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${linkCls}`}
          >
            <GithubIcon />
            Var6
          </a>
        </div>
      </div>
    </footer>
  );
}

/** Round avatar with initials fallback. */
export function Avatar({
  name,
  src,
  className = "size-10",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${className} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-bata-50 text-sm font-bold text-bata-700`}
    >
      {initials}
    </span>
  );
}

export { Link };
