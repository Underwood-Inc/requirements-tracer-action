/** Process exit codes used by the tracer CLI. */
export const ExitCode = {
  Ok: 0,
  AuditFailed: 1,
  IoError: 2,
  ConfigInvalid: 3,
  GitHubError: 4,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];
