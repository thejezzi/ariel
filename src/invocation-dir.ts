export function getInvocationDir(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): string {
  return env.INIT_CWD || cwd;
}
