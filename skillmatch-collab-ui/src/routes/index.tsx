import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  UserRound,
  FolderKanban,
  Handshake,
  ArrowRight,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SkillBadge } from "@/components/SkillBadge";
import { MatchRing } from "@/components/MatchRing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkillMatch — Find the right skills. Build the right team." },
      {
        name: "description",
        content:
          "SkillMatch helps students discover projects, match on real technical skills and build balanced teams on campus.",
      },
      { property: "og:title", content: "SkillMatch — Skill-based team matching for students" },
      {
        property: "og:description",
        content: "Discover projects, match on skills and build balanced student teams.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Sparkles,
    title: "Skill-based matching",
    body: "A match score compares your skill set against every project's requirements, so you instantly see where you fit.",
  },
  {
    icon: UserRound,
    title: "Student profiles",
    body: "One profile with your bio, GitHub and technical skills — the only portfolio you need to get picked.",
  },
  {
    icon: FolderKanban,
    title: "Project collaboration",
    body: "Post a project, define the roles and required stack, and keep track of your team in one workspace.",
  },
  {
    icon: Handshake,
    title: "Team requests",
    body: "Send and receive join requests with clear pending, accepted and rejected states. No more group-chat chaos.",
  },
];

const steps = [
  { n: "01", title: "Build your profile", body: "Add your bio, GitHub and the technical skills you actually want to use." },
  { n: "02", title: "Get matched", body: "SkillMatch ranks open projects by how well your skills cover the requirements." },
  { n: "03", title: "Request to join", body: "Send a request, get accepted, and start shipping with the right teammates." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
          <Logo withTagline />
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild variant="hero" size="sm">
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="aurora mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" /> Skill-based team matching for students
              </span>
              <h1 className="mt-6 text-4xl leading-[1.05] font-bold sm:text-6xl">
                Find the right skills.
                <br />
                <span className="text-gradient">Build the right team.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                SkillMatch turns scattered classroom group-forming into a proper matching engine.
                List your skills, discover student projects that need exactly what you bring, and
                assemble teams that can actually ship.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="lg">
                  <Link to="/register">
                    Find Your Team <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="subtle" size="lg">
                  <Link to="/projects">Explore Projects</Link>
                </Button>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
                {[
                  ["1,200+", "Students"],
                  ["340", "Live projects"],
                  ["18", "Skill clusters"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="font-display text-2xl font-bold">{value}</dt>
                    <dd className="text-xs text-muted-foreground">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="surface-card p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Top match for you</p>
                  <h2 className="mt-1 truncate text-lg font-semibold">
                    CampusHire — Placement Portal
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">Owner · Meera Iyer</p>
                </div>
                <MatchRing value={92} size={72} />
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-success">Matching skills</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Python", "MySQL", "Flask"].map((s) => (
                      <SkillBadge key={s} skill={s} tone="match" />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-warning">Missing skills</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <SkillBadge skill="React" tone="missing" />
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-border bg-background/40 p-4 text-xs text-muted-foreground">
                Match score is calculated from the overlap between your profile skills and the
                project's required stack.
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Everything a student team needs</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Four building blocks that take you from "who's free this semester?" to a team with
            complementary skills.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <article key={f.title} className="surface-card p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((s) => (
              <article key={s.n} className="surface-card p-6">
                <span className="text-gradient font-display text-3xl font-bold">{s.n}</span>
                <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="surface-card grid gap-6 p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to build something worth shipping?</h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              Join SkillMatch, list your stack, and let the matching engine find the teams that need
              you this semester.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/register">Find Your Team</Link>
              </Button>
              <Button asChild variant="subtle" size="lg">
                <Link to="/projects">Explore Projects</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-6 sm:px-6">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            SkillMatch · Find the right skills. Build the right team.
          </p>
          <a
            href="https://github.com"
            className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="size-4" /> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
