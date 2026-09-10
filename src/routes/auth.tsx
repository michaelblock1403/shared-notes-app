import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

const searchSchema = z.object({
  modus: z.enum(["anmelden", "registrieren"]).optional(),
  weiter: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Anmelden – Notizraum" },
      {
        name: "description",
        content:
          "Melden Sie sich bei Notizraum an oder legen Sie ein kostenloses Konto an, um gemeinsame Notizen und To-dos zu führen.",
      },
      { property: "og:title", content: "Anmelden – Notizraum" },
      {
        property: "og:description",
        content: "Konto anlegen und gemeinsame Notizen, Einkaufslisten und To-dos starten.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function safeNext(value: string | undefined): string {
  if (!value) return "/app";
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

function AuthPage() {
  const { modus, weiter } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"anmelden" | "registrieren">(modus ?? "registrieren");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const next = safeNext(weiter);

  useEffect(() => {
    if (!loading && user) void navigate({ to: next });
  }, [loading, user, navigate, next]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "registrieren") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next}`,
            data: { display_name: name.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Konto erstellt. Willkommen!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Willkommen zurück!");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(translateAuthError(message));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Anmeldung mit Google hat nicht geklappt.");
        return;
      }
      if (result.redirected) return;
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <div className="glow-grid flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" aria-label="Zur Startseite">
          <BrandMark />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pb-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lift sm:p-8">
          <h1 className="text-2xl font-semibold">
            {mode === "registrieren" ? "Konto anlegen" : "Anmelden"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "registrieren"
              ? "Kostenlos starten und den ersten gemeinsamen Raum anlegen."
              : "Schön, dass Sie wieder da sind."}
          </p>

          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as typeof mode)}
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="registrieren">Registrieren</TabsTrigger>
              <TabsTrigger value="anmelden">Anmelden</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "registrieren" ? (
              <div className="space-y-2">
                <Label htmlFor="name">Anzeigename</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Mira"
                  autoComplete="name"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@beispiel.de"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                autoComplete={mode === "registrieren" ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "registrieren" ? "Konto anlegen" : "Anmelden"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            oder
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={googleBusy}
            type="button"
          >
            {googleBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleIcon className="size-4" />
            )}
            Mit Google fortfahren
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Mit der Anmeldung stimmen Sie der Verarbeitung Ihrer Daten zum Betrieb des Dienstes zu.
          </p>
        </div>
      </main>
    </div>
  );
}

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) return "E-Mail oder Passwort stimmt nicht.";
  if (message.includes("User already registered"))
    return "Für diese E-Mail gibt es schon ein Konto. Bitte anmelden.";
  if (message.toLowerCase().includes("password"))
    return "Das Passwort ist zu schwach oder zu kurz (mindestens 8 Zeichen).";
  return message;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}
