# Plan: Notizraum – App-Bereich bauen

## Ausgangslage
Start- und Anmeldeseite stehen und sind sichtbar. Der eigentliche App-Bereich (`/app`) fehlt noch (aktuell 404). Datenbank, Auth (E-Mail + Google), Realtime und Designsystem sind eingerichtet. Dieser Plan baut die fehlende, nutzbare Anwendung.

## Entschiedene Konzept-Entscheidungen
- **Eintragstypen:** Drei getrennte Arten – Notiz (Freitext), To-do (abhakbare Aufgabe), Einkaufsliste (Einträge mit Menge + Häkchen). Jeweils eigene Darstellung und Filter.
- **Geräte-Fokus:** Mobile-first PWA, aber Desktop vollständig durchdacht (Sidebar, größere Karten). Responsive, beide gleich ernst.
- **Verlauf:** Beides – kurze Live-Hinweise auf den Notizkarten („bearbeitet vor 2 Min. von Mia") **und** eine aufrufbare Verlauf-Liste im Raum.

## Aufbau (Routen & Ansichten)

```
/app                Layout-Shell (auth-gated via _authenticated)
/app/               Übersicht: Begrüßung, Raum-Karten, offene Einladungen,
                    „Raum anlegen / Beitreten", InstallHint
/app/$spaceId        Raum-Ansicht
/app/settings        Profil-Einstellungen
```

### 1. App-Shell (`src/routes/app.tsx` → Pfad `/app`)
- Auth-Gate: Route liegt unter `_authenticated/` (Integration-managed, `ssr:false`). Falls das Layout noch fehlt, mit anlegen.
- Desktop: linke Sidebar mit Räumen + User-Menü; Hauptbereich `<Outlet />`.
- Mobil: Sidebar als Drawer / Bottom-Nav; User-Menü oben.
- Kopf: BrandMark, aktueller Raum-Name, Mitglieder-Avatars, „Einladen"-Aktion.
- SpaceDialogs (Erstellen / Beitreten per Code) einbinden.

### 2. Übersicht (`src/routes/app/index.tsx`)
- Begrüßung mit Anzeigename.
- Raum-Karten: Emoji, Name, Mitgliederzahl, letzte Aktivität, Pfeil.
- Offene Einladungen: annehmen / ablehnen.
- „Raum anlegen" + „Beitreten per Code" Buttons.
- InstallHint (PWA).
- Leerer Zustand: Hinweis, ersten Raum anzulegen.

### 3. Raum-Ansicht (`src/routes/app/$spaceId.tsx`)
- Header: Emoji + Name (Owner kann umbenennen), Mitglieder, Einladen-Button, Verlauf-Toggle.
- **Filterleiste:** Alle / Notizen / To-dos / Einkaufslisten + Suche + Sortierung (Pin zuerst / zuletzt geändert).
- **Notizkarten:** Titel, Vorschau (Body oder erste Listeneinträge), Farbe, Pin, Kommentarzahl, Autor-Initialen, relative Zeit (Live-Hinweis).
- **Notiz-Composer:** Neue Einträge anlegen, Typ wählen (Notiz/To-do/Einkaufsliste), Farbe, Titel.
- **Detail-Dialog** (Klick auf Karte):
  - Notiz: Titel + Body (inline editierbar).
  - To-do / Einkaufsliste: abhakbare Einträge, Menge bei Einkauf, Hinzufügen/Entfernen, Wer hat abgehakt.
  - Kommentar-Thread: schreiben + löschen (eigene).
  - Pin, Farbe ändern, archivieren, löschen (Owner/Mitglied je nach Regel).
- **Verlauf-Liste:** chronologisch – wer hat was wann angelegt/geändert/abgehakt (aus `activities`).
- **Mitglieder-Sheet:** Liste mit Rollen, Einladen per E-Mail (Einladung + Status), Einladungs-Link/Code kopieren, Raum verlassen (Owner-Rechte berücksichtigen).
- **Realtime:** `useSpaceRealtime` invalidiert Notizen, Items, Kommentare, Aktivitäten, Mitglieder bei Änderungen.

### 4. Profileinstellungen (`src/routes/app/settings.tsx`)
- Anzeigename, Avatar-Farbe ändern.
- E-Mail (read-only), Passwort ändern (mit aktuellem Passwort), Google verknüpft.
- Abmelden.

## Wiederverwendung
- `src/lib/api.ts`, `src/lib/types.ts`, `src/lib/format.ts`, `src/hooks/useSpaceRealtime.ts`, `src/lib/auth.tsx`, `SpaceDialogs.tsx`, `InstallHint.tsx`, `BrandMark.tsx` sind vorhanden und werden eingebunden.
- shadcn/ui Komponenten + Tailwind v4 Designsystem (Nachtblau-Tokens) werden genutzt; keine neuen Farb-Hardcodes.

## Komponenten (neu)
- `NoteCard`, `NoteComposer`, `NoteDetailDialog`, `MembersSheet`, `ActivityList`, `AppSidebar`, `RoomHeader`.

## Datenzugriff
- Lesen/Schreiben über `src/lib/api.ts` (Supabase, RLS-gesichert).
- RPCs `create_space`, `join_space_by_code`, `accept_invitation` bereits vorhanden.
- Profil-Update über `profiles`-Tabelle.

## Quality Bar
- Gängige UX-Regeln: klare Hierarchie, Fokus-Zustände, Tastatur-Bedienung, eindeutige leere Zustände, Bestätigung bei zerstörenden Aktionen.
- Deutsche Texte überall. Nachtblau-Design konsistent zur Startseite.
- Responsive: mobil voll nutzbar (Drawer/Bottom-Nav), Desktop mit Sidebar.
- Nach Bau: Typecheck/Build prüfen, Registrieren → Raum anlegen → Notiz teilen im Browser durchspielen.

## Offene Punkte
- Credits begrenzen den Umfang pro Nachricht; ggf. in mehreren Bau-Schritten umsetzen. Dieser Plan beschreibt das Gesamtbild; bei Bedarf teile ich ihn in aufeinanderfolgende Schritte.
