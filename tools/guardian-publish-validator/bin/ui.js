/*
 * Copyright 2026 Hedera Hashgraph, LLC
 * SPDX-License-Identifier: Apache-2.0
 */

#!/usr/bin/env node
// Tiny web UI for browsing a guardian-tool-validator JSON report.
//
// Usage:
//   node bin/ui.js [--report path/to/report.json] [--port 5173]
//
// The server serves the dashboard, the loaded report, and three action
// endpoints used by the UI buttons:
//   POST /api/scan            kick off a new validator run (async)
//   GET  /api/scan/:id/status poll a scan's status + log tail
//   GET  /api/export.csv      stream the current report's rows as CSV

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    report: null,
    port: Number(process.env.PORT) || 5173,
    libraryPath: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--report' || a === '-r') args.report = argv[++i];
    else if (a === '--port' || a === '-p') args.port = Number(argv[++i]);
    else if (a === '--library' || a === '-l') args.libraryPath = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(`guardian-tool-validator UI

USAGE
  node bin/ui.js [--report <path>] [--library <path>] [--port <n>]

OPTIONS
  -r, --report <path>    Path to the validator's JSON report file.
                         If omitted, looks for the most recently modified
                         report*.json in the cwd, /tmp, and the project root.
  -l, --library <path>   Default methodology library path used when starting
                         a scan from the UI. The user can still override
                         this in the scan-options modal.
  -p, --port <n>         Port to listen on. Default: 5173.
`);
      process.exit(0);
    }
  }
  return args;
}

function findLatestReport(explicitPath) {
  if (explicitPath) {
    if (!fs.existsSync(explicitPath)) {
      throw new Error(`Report not found at: ${explicitPath}`);
    }
    return path.resolve(explicitPath);
  }
  const candidates = [];
  for (const dir of [process.cwd(), '/tmp', projectRoot]) {
    try {
      for (const name of fs.readdirSync(dir)) {
        if (/report.*\.json$/i.test(name)) {
          const full = path.join(dir, name);
          const stat = fs.statSync(full);
          if (stat.isFile()) candidates.push({ full, mtime: stat.mtimeMs });
        }
      }
    } catch {
      // ignore
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0].full;
}

const args = parseArgs(process.argv.slice(2));
let reportPath = findLatestReport(args.report);
// Track the active report path even after scans finish so /api/report
// can return the freshest data without restarting the server.

// Job table for async scans. Keyed by jobId. State per job:
//   { id, status: 'running'|'done'|'failed', startedAt, finishedAt,
//     reportPath, logLines: [], exitCode }
const jobs = new Map();

const app = express();
app.use(express.json({ limit: '32kb' }));

app.get('/api/report', (_req, res) => {
  if (!reportPath || !fs.existsSync(reportPath)) {
    return res.status(404).json({
      error: 'No report found yet. Click "Run scan" to generate one.',
    });
  }
  try {
    const raw = fs.readFileSync(reportPath, 'utf8');
    const report = JSON.parse(raw);
    report._reportPath = reportPath;
    report._loadedAt = new Date().toISOString();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start a new validator run as a child process and return a job id the
// client can poll. The validator writes its own JSON report to a temp
// path; on success we rebind reportPath to it so subsequent /api/report
// reads pick up the new data.
app.post('/api/scan', (req, res) => {
  const body = req.body || {};
  // libraryPath is now optional. If unset, the validator auto-clones the
  // upstream repo (default: hashgraph/guardian@main) into its local cache.
  const libraryPath = body.libraryPath || args.libraryPath || null;
  if (libraryPath && !fs.existsSync(libraryPath)) {
    return res.status(400).json({ error: `libraryPath does not exist: ${libraryPath}` });
  }

  const network = body.network || 'testnet';
  const filter = body.filter || null;
  const concurrency = body.concurrency ? String(Number(body.concurrency)) : '4';
  const ipfsTimeoutMs = body.ipfsTimeoutMs ? String(Number(body.ipfsTimeoutMs)) : '12000';
  const skipIpfs = !!body.skipIpfs;
  const repo = body.repo || 'hashgraph/guardian';
  const branch = body.branch || 'main';
  // Operator's local Kubo. Comma-separated string of URLs accepted from the UI.
  const localGateways = Array.isArray(body.localGateways)
    ? body.localGateways
    : typeof body.localGateways === 'string' && body.localGateways.trim()
      ? body.localGateways.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  const jobId = `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const outputPath = path.join(os.tmpdir(), `${jobId}.report.json`);

  const cliArgs = [
    path.join(projectRoot, 'bin', 'validator.js'),
    '--network', network,
    '--concurrency', concurrency,
    '--ipfs-timeout-ms', ipfsTimeoutMs,
    '--repo', repo,
    '--branch', branch,
    '--json', outputPath,
  ];
  if (libraryPath) cliArgs.unshift('--path', libraryPath);
  if (filter) cliArgs.push('--filter', filter);
  if (skipIpfs) cliArgs.push('--skip-ipfs');
  for (const url of localGateways) cliArgs.push('--local-gateway', url);
  // Re-insert --path at the front if we had one (we shifted onto the array above).
  // The unshift call above placed --path before everything; nothing more to do.

  const job = {
    id: jobId,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    reportPath: outputPath,
    logLines: [],
    exitCode: null,
    request: { libraryPath, network, filter, concurrency, ipfsTimeoutMs, skipIpfs, repo, branch, localGateways },
  };
  jobs.set(jobId, job);

  const child = spawn('node', cliArgs, { cwd: projectRoot });

  const pushLog = (chunk) => {
    const text = chunk.toString('utf8');
    // Each "." or "X" or "o" in the validator output is a per-ref tick.
    // Capture lines as well as raw progress markers so the client can
    // show meaningful progress.
    job.logLines.push(text);
    // Keep memory bounded.
    if (job.logLines.length > 500) job.logLines.splice(0, job.logLines.length - 500);
  };
  child.stdout.on('data', pushLog);
  child.stderr.on('data', pushLog);
  child.on('close', (code) => {
    job.exitCode = code;
    job.finishedAt = new Date().toISOString();
    if (code === 0 && fs.existsSync(outputPath)) {
      job.status = 'done';
      reportPath = outputPath; // promote to active report
    } else {
      job.status = 'failed';
    }
  });
  child.on('error', (err) => {
    job.status = 'failed';
    job.exitCode = -1;
    job.logLines.push(`spawn error: ${err.message}\n`);
  });

  res.json({ jobId, status: job.status, startedAt: job.startedAt });
});

app.get('/api/scan/:id/status', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'unknown job' });
  // Send the last ~80 lines of log for progress display.
  const tail = job.logLines.join('').split('\n').slice(-80).join('\n');
  res.json({
    id: job.id,
    status: job.status,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    exitCode: job.exitCode,
    log: tail,
    reportPath: job.status === 'done' ? job.reportPath : null,
  });
});

// CSV export of the current report. Handy for handing the broken-list off
// to whoever's going to run the republisher, or for sharing with a partner.
app.get('/api/export.csv', (_req, res) => {
  if (!reportPath || !fs.existsSync(reportPath)) {
    return res.status(404).send('No report loaded');
  }
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const rows = (report.refs || []).map((r) => ({
      name: r.name || '',
      type: r.type || '',
      status: r.status || '',
      topicId: r.topicId || '',
      messageId: r.messageId || '',
      cid: r.cid || '',
      occurrenceCount: (r.occurrences || []).length,
      firstOccurrence: r.occurrences?.[0]?.source || r.occurrences?.[0]?.archive || '',
    }));
    const headers = Object.keys(rows[0] || { name: '', type: '', status: '' });
    const out = [headers.join(',')];
    for (const row of rows) {
      out.push(headers.map((h) => csvCell(row[h])).join(','));
    }
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="guardian-tool-validator-${stamp}.csv"`
    );
    res.send(out.join('\n'));
  } catch (err) {
    res.status(500).send(`export failed: ${err.message}`);
  }
});

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

app.use(express.static(path.join(projectRoot, 'ui')));

app.listen(args.port, () => {
  console.log('guardian-tool-validator UI');
  console.log(`  report:  ${reportPath || '(none loaded — run a scan from the UI)'}`);
  console.log(`  library: ${args.libraryPath || '(use the scan-options modal to set one)'}`);
  console.log(`  open:    http://localhost:${args.port}`);
});
