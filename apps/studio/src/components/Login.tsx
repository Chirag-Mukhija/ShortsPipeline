// Passcode screen shown when the studio is reachable on the network and this device hasn't unlocked it yet.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { studio } from "../api";
import { Button } from "./ui";

export function Login() {
  const client = useQueryClient();
  const [passcode, setPasscode] = useState("");
  const login = useMutation({
    mutationFn: () => studio.login(passcode),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["auth"] }),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (passcode) login.mutate();
  };
  return (
    <main className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-line bg-panel p-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Studio locked</h1>
          <p className="mt-1 text-sm text-muted">Enter your studio passcode. This device stays unlocked for 30 days.</p>
        </div>
        <input
          type="password"
          autoFocus
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          className="rounded-xl border border-line bg-bg px-4 py-3 text-base outline-none focus:border-accent"
          placeholder="Passcode"
        />
        {login.error ? <p className="text-sm text-bad">{login.error.message}</p> : null}
        <Button tone="primary" type="submit" disabled={!passcode || login.isPending}>
          Unlock
        </Button>
      </form>
    </main>
  );
}
