#!/usr/bin/env node
import path from 'node:path';
import { Command } from 'commander';
import open from 'open';
import { getInvocationDir } from './invocation-dir.js';
import { findAvailablePort } from './port.js';
import { resolveDocsTarget } from './resolve-docs-dir.js';
import { startServer } from './server.js';

interface RunOptions {
  port: string;
  open: boolean;
}

async function runApp(targetPath: string, options: RunOptions) {
  const invocationDir = getInvocationDir();
  const resolvedTargetPath = path.resolve(invocationDir, targetPath);
  const target = await resolveDocsTarget(resolvedTargetPath);
  const preferredPort = Number(options.port);
  const port = await findAvailablePort(preferredPort);
  const server = await startServer({ docsDir: target.docsDir, port, singleFile: target.singleFile });
  const url = `http://localhost:${server.port}/${server.site.startPage}`;
  if (server.port !== preferredPort) {
    console.error(`Port ${preferredPort} is busy, using ${server.port} instead.`);
  }
  console.log(url);
  if (options.open) await open(url);
}

const program = new Command();

program
  .name('docs-renderer')
  .description('Serve a local markdown/mdx documentation folder in the browser')
  .version('0.1.0')
  .argument('[path]', 'docs directory, project folder containing ./docs, or a single .md/.mdx file', '.')
  .option('-p, --port <port>', 'port to listen on', '3232')
  .option('--no-open', 'do not open the browser automatically')
  .action(async (targetPath, options) => {
    await runApp(targetPath, options as RunOptions);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
