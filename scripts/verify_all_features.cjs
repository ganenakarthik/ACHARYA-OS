const fs = require('fs');
const path = require('path');
const os = require('os');

async function testAll() {
  console.log('--- 1. Testing errorDoctor Module ---');
  // Use dynamic import since src/lib/errorDoctor.js uses ESM
  const { isStackTraceOrError, diagnoseStackTrace } = await import('../src/lib/errorDoctor.js');
  
  const sampleTrace = `Traceback (most recent call last):
  File "scheduler.py", line 42, in schedule_next
    next_task = ready_queue[index]
IndexError: list index out of range`;

  const isDetected = isStackTraceOrError(sampleTrace);
  console.log('✓ isStackTraceOrError detected:', isDetected);
  if (!isDetected) throw new Error('StackTrace detection failed');

  const diagnosis = await diagnoseStackTrace(sampleTrace);
  console.log('✓ Diagnosis errorType:', diagnosis.errorType);
  console.log('✓ Diagnosis filename:', diagnosis.filename);
  console.log('✓ Diagnosis exactFixCode:\n' + diagnosis.exactFixCode);
  if (!diagnosis.exactFixCode || !diagnosis.markdownReport) throw new Error('Diagnosis payload incomplete');

  console.log('\n--- 2. Testing lectureNotesGenerator Module ---');
  const { synthesizeLectureNotes } = await import('../src/lib/lectureNotesGenerator.js');
  const notes = await synthesizeLectureNotes('Operating Systems Deadlock');
  console.log('✓ Notes topic:', notes.topic);
  console.log('✓ Notes executiveSummary:', notes.executiveSummary?.slice(0, 80) + '...');
  console.log('✓ Notes viva questions count:', notes.vivaQuestions?.length);
  if (!notes.topic || !notes.vivaQuestions) throw new Error('Notes generation failed');

  console.log('\n--- 3. Testing Desktop Write Paths ---');
  const primaryDesktop = path.join(os.homedir(), 'OneDrive', 'Desktop');
  const fallbackDesktop = path.join(os.homedir(), 'Desktop');
  console.log('Primary desktop exists:', fs.existsSync(primaryDesktop), primaryDesktop);
  console.log('Fallback desktop exists:', fs.existsSync(fallbackDesktop), fallbackDesktop);

  const testFile1 = path.join(primaryDesktop, 'Acharya_Operating_Systems_Deadlock.md');
  const testFile2 = path.join(primaryDesktop, 'Acharya_Memory_Revision_CheatSheet.md');
  const testFile3 = path.join(primaryDesktop, 'Acharya_Debug_Report_IndexError.md');

  console.log('✓ Deadlock Notes on Desktop:', fs.existsSync(testFile1), fs.statSync(testFile1).size, 'bytes');
  console.log('✓ Revision Cheat Sheet on Desktop:', fs.existsSync(testFile2), fs.statSync(testFile2).size, 'bytes');
  console.log('✓ Debug Report on Desktop:', fs.existsSync(testFile3), fs.statSync(testFile3).size, 'bytes');

  console.log('\n========================================');
  console.log('>>> 100% ALL SYSTEMS VERIFIED WORKING! <<<');
  console.log('========================================');
}

testAll().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
