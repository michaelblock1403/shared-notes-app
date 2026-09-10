import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "notizraum:install-hint";

/** Zeigt einen dezenten Hinweis, die App auf dem Gerät zu installieren. */
export function InstallHint() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !promptEvent) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3 pl-4">
      <Download className="size-4 shrink-0 text-primary" aria-hidden />
      <p className="flex-1 text-sm">
        Notizraum als App installieren – schneller Zugriff direkt vom Startbildschirm.
      </p>
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
      <Button size="icon" variant="ghost" onClick={dismiss} aria-label="Hinweis ausblenden">
        <X className="size-4" />
      </Button>
    </div>
  );
}
