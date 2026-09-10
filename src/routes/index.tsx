import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  CloudLightning,
  ListChecks,
  MessageSquare,
  Smartphone,
  Users,
} from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Notizraum – Notizen & To-dos gemeinsam führen" },
      {
        name: "description",
        content:
          "Notizraum bündelt Tagesnotizen, Einkaufslisten und To-dos an einem Ort. Räume teilen, live zusammenarbeiten, aufs Handy installieren.",
      },
      { property: "og:title", content: "Notizraum – Notizen & To-dos gemeinsam führen" },
      {
        property: "og:description",
        content:
          "Gemeinsame Notizen, Einkaufslisten und To-dos für WG, Familie und Team. Live synchron und installierbar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: ListChecks,
    title: "Drei Arten von Einträgen",
    text: "Freie Tagesnotiz, abhakbare To-do-Liste oder Einkaufsliste mit Mengenangabe – jeweils passend dargestellt.",
  },
  {
    icon: Users,
    title: "Räume statt Chaos",
    text: "Ein Raum pro Kontext: WG, Familie, Projekt. Per E-Mail einladen oder Einladungslink teilen.",
  },
  {
    icon: CloudLightning,
    title: "Sofort synchron",
    text: "Hakt jemand einen Punkt ab, sehen alle anderen es im selben Moment – ohne Neuladen.",
  },
  {
    icon: MessageSquare,
    title: "Kommentare & Verlauf",
    text: "Rückfragen direkt an der Notiz klären und im Aktivitätsverlauf sehen, wer was geändert hat.",
  },
  {
    icon: Smartphone,
    title: "Als App installierbar",
    text: "Progressive Web App: Zum Home-Bildschirm hinzufügen und im Vollbild ohne Browserleiste nutzen.",
  },
  {
    icon: CheckCircle2,
    title: "Auf Bedienbarkeit gebaut",
    text: "Klare Hierarchie, große Tippflächen, Tastaturbedienung, sichtbarer Fokus und ruhiger Dunkelmodus.",
  },
];

function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen glow-grid">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <BrandMark />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Anmelden</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={user && !loading ? "/app" : "/auth"}>
              {user && !loading ? "Zur App" : "Kostenlos starten"}
            </Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              Live-Zusammenarbeit · Progressive Web App
            </p>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl lg:text-6xl">
              Der Notizblock, den ihr <span className="text-primary">gemeinsam</span> führt.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Einkaufsliste, Tagesnotizen und To-dos an einem Ort. Legt Räume an, ladet Menschen ein
              und arbeitet in Echtzeit zusammen – am Schreibtisch wie unterwegs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Jetzt Raum anlegen</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth" search={{ modus: "anmelden" }}>
                  Ich habe schon ein Konto
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Kostenlos, ohne Kreditkarte. Anmeldung per E-Mail oder Google.
            </p>
          </div>

          <PreviewCard />
        </section>

        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-16 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-border bg-card p-5">
                <feature.icon className="size-5 text-primary" aria-hidden />
                <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-20 text-center">
          <h2 className="text-3xl font-semibold text-balance">
            In zwei Minuten eingerichtet – und alle sind auf dem gleichen Stand.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Konto anlegen, Raum erstellen, Einladungscode teilen. Mehr braucht es nicht.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/auth">Kostenlos starten</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <p>Ein Projekt zum Zeigen: gemeinsames Notieren, sauber umgesetzt.</p>
        </div>
      </footer>
    </div>
  );
}

function PreviewCard() {
  return (
    <div className="relative" aria-hidden>
      <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" />
      <div className="relative rounded-3xl border border-border bg-surface p-4 shadow-lift">
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="text-sm font-medium">🏠 WG Lindenstraße</span>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success">
            3 online
          </span>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Einkauf Samstag</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["Hafermilch", true],
                ["Tomaten, 1 kg", true],
                ["Kaffeebohnen", false],
                ["Spülmittel", false],
              ].map(([label, done]) => (
                <li key={String(label)} className="flex items-center gap-2.5">
                  <span
                    className={
                      done
                        ? "grid size-4 place-items-center rounded border border-primary bg-primary text-primary-foreground"
                        : "size-4 rounded border border-border"
                    }
                  >
                    {done ? <CheckCircle2 className="size-3" /> : null}
                  </span>
                  <span className={done ? "text-muted-foreground line-through" : ""}>
                    {String(label)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 rounded-full bg-primary" />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Notiz · Paket abholen</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Abholschein liegt auf der Kommode, Filiale bis 18 Uhr offen.
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground">Mira · vor 4 Minuten</p>
          </div>
        </div>
      </div>
    </div>
  );
}
