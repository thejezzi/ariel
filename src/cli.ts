#!/usr/bin/env node
import { Command } from 'commander';
import open from 'open';
import { resolveDocsDir } from './resolve-docs-dir.js';
import { startServer } from './server.js';

interface RunOptions {
  port: string;
  open: boolean;
}

async function runApp(targetPath: string, options: RunOptions) {
  const docsDir = await resolveDocsDir(targetPath);
  const server = await startServer({ docsDir, port: Number(options.port) });
  const url = `http://localhost:${server.port}/${server.site.startPage}`;
  console.log(url);
  if (options.open) await open(url);
}

const program = new Command();

program
  .name('docs-renderer')
  .description('Serve a local markdown/mdx documentation folder in the browser')
  .version('0.1.0')
  .argument('[path]', 'docs directory, or a project folder containing ./docs', '.')
  .option('-p, --port <port>', 'port to listen on', '3232')
  .option('--no-open', 'do not open the browser automatically')
  .action(async (targetPath, options) => {
    await runApp(targetPath, options as RunOptions);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
