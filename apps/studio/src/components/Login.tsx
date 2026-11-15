// Passcode screen shown when the studio is reachable on the network and this device hasn't unlocked it yet.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { studio } from "../api";
import { Logo } from "./Sidebar";
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
    <main className="flex min-h-full items-center justify-center px-5">
      <form onSubmit={submit} className="rise flex w-full max-w-[360px] flex-col gap-5">
        <Logo />
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em]">Studio locked</h1>
          <p className="mt-1.5 text-sm text-muted">Enter your passcode. This device stays unlocked for 30 days.</p>
        </div>
        <input type="password" autoFocus value={passcode} onChange={(event) => setPasscode(event.target.value)} className="field !h-11 !text-base" placeholder="Passcode" />
        {login.error ? <p className="-mt-2 text-sm text-bad">{login.error.message}</p> : null}
        <Button tone="primary" type="submit" className="!h-11" disabled={!passcode || login.isPending}>
          {login.isPending ? "Unlocking…" : "Unlock"}
        </Button>
      </form>
    </main>
  );
}
