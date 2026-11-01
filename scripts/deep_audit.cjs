const fs = require('fs');
const path = require('path');
const os = require('os');

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 ACHARYA SYSTEM-WIDE TECHNICAL AUDIT & STRESS TEST');
  console.log('====================================================\n');

  const findings = [];
  const warnings = [];

  // ----------------------------------------------------
  // TEST 1: Windows File Path & Illegal Characters Audit
  // ----------------------------------------------------
  console.log('[AUDIT 1] Testing Windows Filename Sanitization...');
  const problematicTopics = [
    'Computer Networks: TCP/IP & 3-Way Handshake?',
    'C/C++ Pointers: *ptr vs &ref (Memory Leak?)',
    'SQL Injection: "OR 1=1 --" Attack Patterns',
    'OS Scheduling: Round-Robin | Priority <Preemptive>',
    'What is B+ Tree Indexing in DBMS?'
  ];

  const windowsIllegal = /[\<\>\:\"\/\\\|\?\*]/;
  problematicTopics.forEach(topic => {
    const cleanTopic = (topic || 'Lecture_Notes')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 50);
    const filename = `Acharya_${cleanTopic}.md`;
    
    if (windowsIllegal.test(filename)) {
      findings.push(`CRITICAL: Filename "${filename}" contains illegal Windows characters!`);
    } else {
      // Test actual file write and deletion
      const testPath = path.join(os.tmpdir(), filename);
      try {
        fs.writeFileSync(testPath, '# Test Content', 'utf8');
        fs.unlinkSync(testPath);
      } catch (err) {
        findings.push(`CRITICAL: Failed to write test file "${filename}": ${err.message}`);
      }
    }
  });
  console.log('✓ Filename sanitization audit completed.');

  // ----------------------------------------------------
  // TEST 2: IPC Channels Mapping (Renderer vs Main)
  // ----------------------------------------------------
  console.log('\n[AUDIT 2] Auditing IPC Channel Parity...');
  const mainCjsPath = path.join(__dirname, '../electron/main.cjs');
  const mainContent = fs.readFileSync(mainCjsPath, 'utf8');

  const hudPath = path.join(__dirname, '../src/components/DesktopHUD.jsx');
  const hudContent = fs.readFileSync(hudPath, 'utf8');

  // Find all ipcMain.handle and ipcMain.on in main.cjs
  const mainHandlers = new Set();
  const handleMatches = mainContent.matchAll(/ipcMain\.(handle|on)\(\s*['"]([^'"]+)['"]/g);
  for (const m of handleMatches) {
    mainHandlers.add(m[2]);
  }

  // Find all electron.invoke and electron.send in DesktopHUD.jsx
  const rendererCalls = new Set();
  const invokeMatches = hudContent.matchAll(/electron\.(invoke|send)\(\s*['"]([^'"]+)['"]/g);
  for (const m of invokeMatches) {
    rendererCalls.add(m[2]);
  }

  console.log(`Registered IPC Handlers in electron/main.cjs: ${mainHandlers.size}`);
  console.log(`IPC Calls in DesktopHUD.jsx: ${rendererCalls.size}`);

  rendererCalls.forEach(channel => {
    // Some channels are standard Electron or dynamically handled
    if (!mainHandlers.has(channel)) {
      warnings.push(`IPC Warning: DesktopHUD calls "${channel}" but no matching ipcMain handler was found in main.cjs`);
    }
  });

  // Check for duplicate handlers in main.cjs
  const channelCounts = {};
  const allRegistrations = mainContent.matchAll(/ipcMain\.handle\(\s*['"]([^'"]+)['"]/g);
  for (const r of allRegistrations) {
    channelCounts[r[1]] = (channelCounts[r[1]] || 0) + 1;
    if (channelCounts[r[1]] > 1) {
      findings.push(`CRITICAL BUG: Duplicate ipcMain.handle registered for "${r[1]}"! This will crash Electron!`);
    }
  }

  // ----------------------------------------------------
  // TEST 3: Edge-Case Stress Testing of Core Modules
  // ----------------------------------------------------
  console.log('\n[AUDIT 3] Stress Testing Core Modules with Malformed Inputs...');
  
  // A. errorDoctor
  const { isStackTraceOrError, diagnoseStackTrace } = await import('../src/lib/errorDoctor.js');
  try {
    if (isStackTraceOrError(null) !== false) findings.push('errorDoctor: isStackTraceOrError(null) did not return false');
    if (isStackTraceOrError('') !== false) findings.push('errorDoctor: isStackTraceOrError("") did not return false');
    if (isStackTraceOrError(12345) !== false) findings.push('errorDoctor: isStackTraceOrError(number) did not return false');

    const diagEmpty = await diagnoseStackTrace('');
    if (diagEmpty !== null) findings.push('errorDoctor: diagnoseStackTrace("") did not return null');

    const diagWeird = await diagnoseStackTrace('Random text without stack trace');
    if (!diagWeird || !diagWeird.rootCause) findings.push('errorDoctor: failed to handle non-stack trace fallback');
  } catch (err) {
    findings.push(`CRITICAL: errorDoctor crashed on edge-case inputs: ${err.message}`);
  }

  // B. codeAnalyzer
  const { analyzeCode, applySmartFix, applyAllSmartFixes } = await import('../src/lib/codeAnalyzer.js');
  try {
    const resNull = analyzeCode(null, 'python');
    if (!resNull || !Array.isArray(resNull.errors)) findings.push('codeAnalyzer: analyzeCode(null) did not return valid result with errors array');

    const fixNull = applySmartFix(null, null);
    if (typeof fixNull !== 'string') findings.push('codeAnalyzer: applySmartFix(null, null) crashed or did not return string');

    const fixAllNull = applyAllSmartFixes(null, null);
    if (fixAllNull !== null) findings.push('codeAnalyzer: applyAllSmartFixes(null, null) failed');
  } catch (err) {
    findings.push(`CRITICAL: codeAnalyzer crashed on edge cases: ${err.message}`);
  }

  // C. lectureNotesGenerator
  const { synthesizeLectureNotes } = await import('../src/lib/lectureNotesGenerator.js');
  try {
    const emptyNotes = await synthesizeLectureNotes('', '');
    if (emptyNotes !== null) findings.push('lectureNotesGenerator: empty input did not return null');

    const weirdNotes = await synthesizeLectureNotes('???###$$$***', '');
    if (!weirdNotes || !weirdNotes.topic || !weirdNotes.vivaQuestions) {
      findings.push('lectureNotesGenerator: failed to handle special character topic');
    }
  } catch (err) {
    findings.push(`CRITICAL: lectureNotesGenerator crashed on edge cases: ${err.message}`);
  }

  // D. timingEngine
  const { evaluateTimingPolicy } = await import('../src/lib/timingEngine.js');
  try {
    const evalEmpty = evaluateTimingPolicy({});
    if (typeof evalEmpty.U !== 'number' || isNaN(evalEmpty.U)) {
      findings.push('timingEngine: evaluateTimingPolicy({}) returned NaN or non-number U');
    }
  } catch (err) {
    findings.push(`CRITICAL: timingEngine crashed on empty signals: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 4: Frontend State and Syntax Audit
  // ----------------------------------------------------
  console.log('\n[AUDIT 4] Checking DesktopHUD.jsx React State & Potential Undefined Vars...');
  
  // Scan for common react bugs:
  // e.g. undefined references, unhandled setState in loops, etc.
  const dangerousPatterns = [
    { pattern: /userProfile\./g, name: 'userProfile is undefined (should be profile)' },
    { pattern: /console\.error/g, name: 'Unhandled console.error calls' }
  ];

  dangerousPatterns.forEach(dp => {
    const matches = [...hudContent.matchAll(dp.pattern)];
    if (matches.length > 0) {
      if (dp.name.includes('userProfile')) {
        findings.push(`CRITICAL: Found ${matches.length} occurrences of "${dp.name}" in DesktopHUD.jsx!`);
      } else {
        warnings.push(`Notice: Found ${matches.length} occurrences of ${dp.name}`);
      }
    }
  });

  // ----------------------------------------------------
  // TEST 5: Summary of Audit Results
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('📋 AUDIT FINDINGS SUMMARY');
  console.log('====================================================');
  
  if (findings.length === 0) {
    console.log('🎉 ZERO CRITICAL BUGS FOUND! Codebase passes all core checks.');
  } else {
    console.log(`❌ FOUND ${findings.length} CRITICAL BUGS:`);
    findings.forEach((f, idx) => console.log(`  [${idx + 1}] ${f}`));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️ ${warnings.length} WARNINGS / OPTIMIZATION OPPORTUNITIES:`);
    warnings.forEach((w, idx) => console.log(`  [${idx + 1}] ${w}`));
  }
  console.log('====================================================\n');

  return { findings, warnings };
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
});
