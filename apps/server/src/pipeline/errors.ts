// Error type steps throw to tell the runner whether a failure is worth retrying.
export class StepError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "StepError";
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isRetryable(error: unknown): boolean {
  return error instanceof StepError ? error.retryable : true;
}
