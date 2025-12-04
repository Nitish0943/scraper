import cron from 'node-cron';
import { runScraper } from './scrape.js';

let isRunning = false;

async function runSafe() {
  if (isRunning) {
    console.log('Previous run still in progress, skipping this tick.');
    return;
  }
  isRunning = true;
  const start = new Date();
  console.log(`[Scheduler] Starting run at ${start.toISOString()}`);
  try {
    await runScraper();
  } catch (err) {
    console.error('[Scheduler] Run failed:', err);
  } finally {
    const end = new Date();
    console.log(`[Scheduler] Finished run at ${end.toISOString()} (duration ${(end - start) / 1000}s)`);
    isRunning = false;
  }
}

// Run once on startup
runSafe();

// Run every day at 03:00 server local time
cron.schedule('0 3 * * *', () => {
  runSafe();
});

console.log('Scheduler is active. Daily run scheduled at 03:00.');
