/**
 * Unified Test Runner for Resource Sharing Platform
 * Executes Part 3 (Authentication), Part 4 (Resource Management),
 * Part 5 (Bookings & Reservations), Part 6 (Check-in & Condition),
 * and Part 7 (Real-Time Notifications Using Socket.IO) test suites.
 */

const { spawn } = require('child_process');
const path = require('path');

const runScript = (scriptName) => {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(__dirname, scriptName);
    console.log(`\n====================================================`);
    console.log(`🏃 Running Test Suite: ${scriptName}`);
    console.log(`====================================================`);

    const child = spawn(process.execPath, [fullPath], { stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test suite ${scriptName} failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
};

async function main() {
  try {
    await runScript('authTest.js');
    await runScript('resourceTest.js');
    await runScript('bookingTest.js');
    await runScript('conditionTest.js');
    await runScript('notificationTest.js');
    await runScript('adminTest.js');
    await runScript('securityTest.js');
    await runScript('integrationTest.js');
    await runScript('rescueTest.js');
    await runScript('proofTest.js');
    await runScript('matchingTest.js');
    await runScript('chatTest.js');
    await runScript('availabilityTest.js');
    await runScript('concurrentBookingTest.js');
    await runScript('studentResourcesTest.js');
    await runScript('themeTest.js');
    console.log('\n🎉 ALL PART 3 THROUGH PART 19 + AVAILABILITY, CONCURRENCY & THEME SYSTEM SUITES PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ Test run failed:', err.message);
    process.exit(1);
  }
}

main();

