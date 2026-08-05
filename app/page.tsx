import Link from "next/link";

const stats = [
  { value: "40+", label: "Public schools supported" },
  { value: "12", label: "NGO partners" },
  { value: "300+", label: "Activities delivered" },
  { value: "5,000+", label: "Volunteer hours" },
];

const steps = [
  {
    step: "01",
    title: "Director sets the stage",
    text: "The director onboards Bata employees and NGO partners, registers public schools, and groups the work into funded projects.",
  },
  {
    step: "02",
    title: "Teams schedule activities",
    text: "Employees plan sessions — a computer class in Purnea, a health camp, a sports day — picking the school, the NGO partner, and the Bata volunteers.",
  },
  {
    step: "03",
    title: "NGOs deliver together",
    text: "Every activity carries a shared checklist of points. The NGO sees the same plan, ticks off what was done, and adds remarks and photos.",
  },
];

const features = [
  {
    title: "Role-based access",
    text: "Three tailored workspaces — Director, Bata Employee, and NGO partner — each seeing exactly what they need.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    ),
  },
  {
    title: "Activity scheduling",
    text: "Plan sessions with date, time, venue, school, NGO partner and participating employees — all in one place.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    ),
  },
  {
    title: "Shared checklists",
    text: "Each activity has agenda points visible to Bata and the NGO alike, with completion ticks and remarks.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: "Volunteer time tracking",
    text: "See how many hours each employee gave — this week, this month — broken down by project and activity type.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    title: "Photo documentation",
    text: "Upload session photos to secure cloud storage so every project has a visual record of impact.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM10.5 8.25h.008v.008H10.5V8.25z"
      />
    ),
  },
  {
    title: "Email notifications",
    text: "Account credentials and password resets reach people by email, so nobody is ever locked out.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    ),
  },
];

const roles = [
  {
    role: "Director",
    color: "bg-bata-600",
    points: [
      "Create & manage employees and NGO partners",
      "Set up projects and register schools",
      "Reset passwords for any account",
      "Track every employee's volunteer hours",
    ],
  },
  {
    role: "Bata Employee",
    color: "bg-zinc-800",
    points: [
      "Browse projects and schools",
      "Schedule activities with NGOs and schools",
      "Build the activity checklist",
      "Log outcomes and upload photos",
    ],
  },
  {
    role: "NGO Partner",
    color: "bg-violet-600",
    points: [
      "See every activity assigned to you",
      "Work from the shared checklist",
      "Tick off points and add remarks",
      "Mark sessions in progress or done",
    ],
  },
];

export default function LandingPage() {
  return (
    <main className="flex-1 bg-white text-zinc-900">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-zinc-950/70 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <img src="/bata-logo-white.svg" alt="Bata" className="h-7 w-auto" />
            <span className="hidden text-sm font-medium tracking-wide text-zinc-300 sm:block">
              CSR Portal
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-300 md:flex">
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#roles" className="transition hover:text-white">Who it&apos;s for</a>
          </div>
          <Link
            href="/login"
            className="rounded-lg bg-bata-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-bata-600/30 transition hover:bg-bata-500"
          >
            Sign in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-zinc-950 pb-24 pt-36 text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(204,34,41,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(204,34,41,0.18),transparent_50%)]"
        />
        <div
          aria-hidden
          className="animate-float absolute -right-40 -top-40 size-[480px] rounded-full bg-bata-600/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-zinc-300">
              <span className="size-1.5 rounded-full bg-bata-500" />
              Corporate Social Responsibility
            </p>
            <h1 className="animate-fade-up mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              Stepping up for
              <span className="bg-linear-to-r from-bata-400 to-bata-600 bg-clip-text text-transparent">
                {" "}public schools
              </span>
              , together.
            </h1>
            <p className="animate-fade-up-slow mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Bata funds and manages public schools across India through trusted NGO
              partners. This portal is where directors, Bata employees, and NGOs plan
              projects, schedule activities, and track every volunteered hour — from a
              computer class in Purnea to a health camp anywhere in the country.
            </p>
            <div className="animate-fade-up-slow mt-10 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="rounded-xl bg-bata-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-bata-600/30 transition hover:-translate-y-0.5 hover:bg-bata-500"
              >
                Sign in to the portal
              </Link>
              <a
                href="#how"
                className="rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                See how it works
              </a>
            </div>
          </div>

          <dl className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-zinc-950/80 p-6 text-center backdrop-blur">
                <dd className="text-3xl font-extrabold text-white">{s.value}</dd>
                <dt className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-bata-600">
          How it works
        </p>
        <h2 className="mt-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          One workflow, three partners
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.step}
              className="group relative rounded-2xl border border-zinc-200 bg-zinc-50 p-8 transition hover:-translate-y-1 hover:border-bata-200 hover:shadow-xl hover:shadow-bata-600/5"
            >
              <span className="text-5xl font-extrabold text-zinc-200 transition group-hover:text-bata-100">
                {s.step}
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 bg-zinc-950 py-24 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-bata-500">
            Features
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Everything the programme needs
          </h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-bata-600/40 hover:bg-white/10"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-bata-600/15 text-bata-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-6">
                    {f.icon}
                  </svg>
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-bata-600">
          Who it&apos;s for
        </p>
        <h2 className="mt-3 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          A workspace for every partner
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {roles.map((r) => (
            <div key={r.role} className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
              <div className={`${r.color} px-6 py-4`}>
                <h3 className="font-bold text-white">{r.role}</h3>
              </div>
              <ul className="space-y-3 bg-white p-6">
                {r.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-zinc-600">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-4 shrink-0 text-bata-600">
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-bata-700 py-20 text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.12),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <img src="/bata-logo-white.svg" alt="Bata" className="mx-auto h-10 w-auto" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to make an impact?
          </h2>
          <p className="mt-3 text-bata-100">
            Sign in with the account your director created for you.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-bata-700 shadow-xl transition hover:-translate-y-0.5 hover:bg-bata-50"
          >
            Sign in to the portal
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-10 text-center">
        <img src="/bata-logo-white.svg" alt="Bata" className="mx-auto h-6 w-auto opacity-70" />
        <p className="mt-4 text-xs text-zinc-500">
          Bata CSR Portal — funding and managing public schools with NGO partners.
        </p>
      </footer>
    </main>
  );
}
