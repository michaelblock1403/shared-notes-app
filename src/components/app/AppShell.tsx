import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Menu,
  Plus,
  Settings as SettingsIcon,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CreateSpaceDialog, JoinSpaceDialog } from "@/components/spaces/SpaceDialogs";
import { fetchSpaces } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

function NavLink({
  to,
  params,
  active,
  onClick,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to as "/app/$spaceId"}
      params={params as { spaceId: string }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-primary/15 text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: spaces } = useQuery({ queryKey: ["spaces"], queryFn: fetchSpaces });
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-1">
        <BrandMark />
      </Link>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" /> Raum anlegen
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => setJoinOpen(true)}
        >
          Beitreten
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        <NavLink to="/app" active={false} onClick={onNavigate} params={undefined}>
          <UsersIcon className="size-4 shrink-0" />
          <span className="font-medium">Übersicht</span>
        </NavLink>
        <p className="px-3 pt-4 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Räume
        </p>
        {(spaces ?? []).length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            Noch keine Räume.
          </p>
        ) : (
          (spaces ?? []).map((space) => (
            <NavLink
              key={space.id}
              to="/app/$spaceId"
              params={{ spaceId: space.id }}
              active={false}
              onClick={onNavigate}
            >
              <span className="text-base leading-none">{space.emoji}</span>
              <span className="truncate">{space.name}</span>
            </NavLink>
          ))
        )}
      </nav>

      <div className="space-y-1 border-t border-border pt-3">
        <NavLink to="/app/settings" active={false} onClick={onNavigate} params={undefined}>
          <SettingsIcon className="size-4 shrink-0" />
          <span>Einstellungen</span>
        </NavLink>
        <button
          type="button"
          onClick={() => {
            toast.success("Bis bald!");
            void handleSignOut();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="size-4 shrink-0" />
          <span>Abmelden</span>
        </button>
      </div>

      {profile ? (
        <div className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-background"
            style={{ backgroundColor: profile.avatar_color || "#5B9DFF" }}
          >
            {initials(profile.display_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile.display_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email ?? profile.email ?? ""}
            </p>
          </div>
        </div>
      ) : null}

      <CreateSpaceDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinSpaceDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground lg:block">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <BrandMark />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Menü"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto safe-bottom">{children}</main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="flex flex-row items-center justify-between px-4 pt-4">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Schließen"
              onClick={() => setOpen(false)}
            >
              <X className="size-5" />
            </Button>
          </SheetHeader>
          <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
            <SidebarBody onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
