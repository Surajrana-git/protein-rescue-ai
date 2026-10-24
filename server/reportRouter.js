import { Router } from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateAnalyzeInput, checkAflatoxinGated } from '../src/data/analysisSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Concurrency limiter to protect server memory and CPU
const MAX_CONCURRENT_REPORTS = 2;
let activeReports = 0;

export function createReportRouter() {
  const router = Router();

  const pythonBin = path.join(__dirname, 'report', '.venv', 'bin', 'python');
  const generatorScript = path.join(__dirname, 'report', 'generator.py');

  router.post('/report', async (req, res) => {
    // 1. Input validation
    const { problems, isValid } = validateAnalyzeInput(req.body);
    if (!isValid || problems.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Input validation failed',
        problems,
      });
    }

    // 2. Concurrency check
    if (activeReports >= MAX_CONCURRENT_REPORTS) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Report generation service is currently busy. Please retry in a few moments.',
      });
    }

    activeReports++;

    // Prepare temporary PDF destination
    const reportToken = crypto.randomBytes(6).toString('hex');
    const timestamp = Date.now();
    const tempFileName = `protein-rescue-${timestamp}-${reportToken}.pdf`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    // Normalize payload
    const {
      feedstock,
      phytate,
      tannin,
      treatmentTime,
      enzymeDose,
    } = req.body;

    const initialProtein = req.body.initialProtein ?? req.body.initialProteinPercent;
    const temperature = req.body.temperature ?? req.body.treatmentTemperature;
    const aflatoxin = req.body.aflatoxin ?? req.body.aflatoxinStatus ?? req.body.aflatoxinTestStatus;

    // Server-side safety gate recomputation
    const { gated } = checkAflatoxinGated(feedstock, aflatoxin);

    const pythonPayload = {
      reportId: `PR-${timestamp.toString().slice(-6)}`,
      feedstock,
      initialProtein: Number(initialProtein),
      phytate: Number(phytate),
      tannin: Number(tannin),
      temperature: Number(temperature),
      treatmentTime: Number(treatmentTime),
      enzymeDose: Number(enzymeDose),
      aflatoxin: aflatoxin || 'Not tested',
      isGated: gated,
    };

    let timedOut = false;
    let processKilled = false;

    try {
      await new Promise((resolve, reject) => {
        // child_process.spawn: no shell, fixed executable, fixed arguments, no user text in args
        const child = spawn(pythonBin, [generatorScript, tempFilePath], {
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        const timer = setTimeout(() => {
          timedOut = true;
          processKilled = true;
          child.kill('SIGKILL');
          reject(new Error('REPORT_TIMEOUT'));
        }, 30000);

        let stderrOutput = '';

        child.stderr.on('data', (chunk) => {
          stderrOutput += chunk.toString();
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          if (processKilled) return;

          if (code === 0) {
            resolve();
          } else {
            // Log for internal observability without leaking paths or internals
            console.error(`Report generation process exited with code ${code}. Stderr length: ${stderrOutput.length}`);
            reject(new Error('GENERATOR_FAILED'));
          }
        });

        // Send payload safely via stdin
        child.stdin.write(JSON.stringify(pythonPayload));
        child.stdin.end();
      });

      // Stream generated PDF to response
      const stat = await fs.promises.stat(tempFilePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', stat.size);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="protein-rescue-report-${feedstock.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.pdf"`
      );

      const fileStream = fs.createReadStream(tempFilePath);
      fileStream.pipe(res);

      await new Promise((resolve) => {
        fileStream.on('end', resolve);
        fileStream.on('error', resolve);
      });
    } catch (err) {
      if (timedOut || err.message === 'REPORT_TIMEOUT') {
        return res.status(504).json({
          error: 'Gateway Timeout',
          message: 'Report generation timed out after 30 seconds.',
        });
      }

      console.error(`Report generation failed: ${err.name || 'Error'}`);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate PDF report. Please check input parameters or try again later.',
      });
    } finally {
      activeReports = Math.max(0, activeReports - 1);
      // Always cleanup temporary file
      fs.promises.unlink(tempFilePath).catch(() => {});
    }
  });

  return router;
}
