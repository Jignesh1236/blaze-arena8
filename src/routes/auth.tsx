import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGuest } from "@/lib/use-auth";

const searchSchema = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Pick your handle — Blazing 8s" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: ProfilePage,
});

const AVATARS = ["🤠", "🐴", "🌵", "🦂", "🪶", "⭐", "🌙", "🔥", "🎩", "🐺"];

function ProfilePage() {
  const { profile, loading, save } = useGuest();
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🤠");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setAvatar(profile.avatar);
    }
  }, [profile]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save(name, avatar);
    navigate({ to: search.next ?? "/" });
  }

  if (loading) return null;

  return (
    <main className="min-h-screen bg-table flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-card">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <h1 className="font-display text-3xl mt-2 mb-1">Pick Your Handle</h1>
        <p className="text-sm text-muted-foreground mb-6">No password, no fuss. Just your name and a face.</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lone Ranger" required maxLength={24} />
          </div>
          <div>
            <Label>Avatar</Label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`text-2xl aspect-square rounded-lg border-2 transition ${avatar === a ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}
                >{a}</button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full bg-sunset font-display h-12 text-lg">
            Saddle up 🤠
          </Button>
        </form>
      </div>
    </main>
  );
}
