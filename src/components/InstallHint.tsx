import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "notizraum:install-hint";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/** Zeigt einen Hinweis, die App auf dem Gerät zu installieren – inklusive iOS-Anleitung. */
export function InstallHint() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios">("hidden");

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    if (isStandalone()) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setMode("prompt");
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => {
      window.localStorage.setItem(DISMISS_KEY, "1");
      setMode("hidden");
    };
    window.addEventListener("appinstalled", installed);

    if (isIos()) setMode("ios");

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (mode === "hidden") return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setMode("hidden");
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3 pl-4">
      {mode === "ios" ? (
        <Share className="size-4 shrink-0 text-primary" aria-hidden />
      ) : (
        <Download className="size-4 shrink-0 text-primary" aria-hidden />
      )}
      <p className="min-w-[12rem] flex-1 text-sm">
        {mode === "ios"
          ? "Notizraum auf dem iPhone installieren: unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen."
          : "Notizraum als App installieren – schneller Zugriff direkt vom Startbildschirm."}
      </p>
      {mode === "prompt" && promptEvent ? (
        <Button
          size="sm"
          onClick={async () => {
            await promptEvent.prompt();
            await promptEvent.userChoice;
            dismiss();
          }}
        >
          Installieren
        </Button>
      ) : null}
      <Button size="icon" variant="ghost" onClick={dismiss} aria-label="Hinweis ausblenden">
        <X className="size-4" />
      </Button>
    </div>
  );
}
