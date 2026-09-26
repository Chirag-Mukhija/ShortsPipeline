// Runs external commands with piped stdin, a timeout and captured output.
import { spawn } from "node:child_process";

export type ExecResult = { code: number | null; stdout: string; stderr: string };

export function exec(
  command: string,
  args: string[],
  options: { input?: string; cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = options.timeoutMs
      ? setTimeout(() => {
          settled = true;
          child.kill("SIGKILL");
          reject(new Error(`${command} timed out after ${Math.round((options.timeoutMs ?? 0) / 1000)}s`));
        }, options.timeoutMs)
      : null;
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      if (!settled) reject(error);
      settled = true;
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (!settled) resolve({ code, stdout, stderr });
      settled = true;
    });
    child.stdin.on("error", () => undefined);
    child.stdin.end(options.input ?? "");
  });
}

export async function execOrThrow(
  command: string,
  args: string[],
  options: Parameters<typeof exec>[2] = {},
): Promise<ExecResult> {
  const result = await exec(command, args, options);
  if (result.code !== 0) {
    throw new Error(`${command} exited with ${result.code}: ${(result.stderr || result.stdout).trim().slice(-800)}`);
  }
  return result;
}
