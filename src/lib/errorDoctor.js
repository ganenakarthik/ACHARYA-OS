/* ================================================================
   ACHARYA AI MENTOR — ZERO-CLICK ERROR DOCTOR (STACK-TRACE AUTOPSY)
   Ambient OS runtime & compiler error diagnostics
   Intercepts copied terminal tracebacks, generates root cause,
   exact 1-line code fix, preventative test assertion,
   and exports an academic debugging report to the Windows Desktop.
   ================================================================ */

export const KNOWN_RUNTIME_PATTERNS = [
  {
    lang: 'Python',
    regex: /(?:Traceback \(most recent call last\):[\s\S]*?)?([A-Za-z]+Error):?\s*(.*)/i,
    extract: (match, text) => {
      const errorClass = match[1] || 'RuntimeError'
      const lineMatch = text.match(/File "([^"]+)", line (\d+)(?:, in (\w+))?/i)
      const file = lineMatch ? lineMatch[1] : 'script.py'
      const lineNum = lineMatch ? lineMatch[2] : 'unknown'
      return { errorClass, file, lineNum, details: match[2] || '' }
    }
  },
  {
    lang: 'Java',
    regex: /Exception in thread "[^"]*"\s+([a-zA-Z0-9_.]+(?:Exception|Error)):?\s*(.*)/i,
    extract: (match, text) => {
      const fullError = match[1] || 'java.lang.NullPointerException'
      const shortError = fullError.split('.').pop()
      const atMatch = text.match(/at\s+([a-zA-Z0-9_$.]+\([a-zA-Z0-9_]+\.java:(\d+)\))/i)
      return {
        errorClass: shortError,
        file: atMatch ? atMatch[1] : 'Main.java',
        lineNum: atMatch ? atMatch[2] : 'unknown',
        details: match[2] || ''
      }
    }
  },
  {
    lang: 'C/C++',
    regex: /(Segmentation fault(?:\s*\(core dumped\))?|core dumped|fatal error:\s*([^\n]+)|undefined reference to `([^']+)')/i,
    extract: (match, text) => {
      return {
        errorClass: match[1].includes('Segmentation') ? 'SegmentationFault (SIGSEGV)' : 'Compilation/Linker Error',
        file: 'source.c / source.cpp',
        lineNum: 'SIGSEGV',
        details: match[0]
      }
    }
  },
  {
    lang: 'JavaScript',
    regex: /(ReferenceError|TypeError|SyntaxError|RangeError):\s*([^\n]+)/i,
    extract: (match, text) => {
      const lineMatch = text.match(/at\s+.*?:(\d+):(\d+)/i)
      return {
        errorClass: match[1],
        file: 'app.js',
        lineNum: lineMatch ? lineMatch[1] : 'unknown',
        details: match[2] || ''
      }
    }
  }
]

export function isStackTraceOrError(text = '') {
  if (!text || typeof text !== 'string') return false
  const t = text.trim()
  if (t.length < 15) return false

  return (
    t.includes('Traceback (most recent call last)') ||
    /Exception in thread/i.test(t) ||
    /NullPointerException/i.test(t) ||
    /IndexError:/i.test(t) ||
    /Segmentation fault/i.test(t) ||
    /ZeroDivisionError:/i.test(t) ||
    /ReferenceError:/i.test(t) ||
    /TypeError:\s*Cannot read/i.test(t) ||
    /KeyError:/i.test(t) ||
    /ArrayIndexOutOfBoundsException/i.test(t) ||
    /IndentationError:/i.test(t) ||
    /SyntaxError:/i.test(t) ||
    /fatal error:.*No such file/i.test(t) ||
    /AssertionError/i.test(t)
  )
}

export async function diagnoseStackTrace(rawErrorText) {
  if (!rawErrorText) return null
  const cleaned = rawErrorText.trim()

  // Match language & error signature
  let lang = 'General Code'
  let errorClass = 'Runtime Exception'
  let file = 'terminal_output'
  let lineNum = 'N/A'
  let details = ''

  for (const kp of KNOWN_RUNTIME_PATTERNS) {
    const m = cleaned.match(kp.regex)
    if (m) {
      lang = kp.lang
      const extracted = kp.extract(m, cleaned)
      errorClass = extracted.errorClass
      file = extracted.file
      lineNum = extracted.lineNum
      details = extracted.details
      break
    }
  }

  // Fast offline curated knowledge base for 100% demo uptime
  const curated = getCuratedDiagnosis(errorClass, lang, file, lineNum, details, cleaned)

  // Try neural enrichment via fast POST
  try {
    const prompt = `You are Acharya, an elite compiler diagnostics and runtime debugger.
Analyze this terminal error traceback:
"""
${cleaned.slice(0, 1500)}
"""

Respond ONLY in valid JSON matching this exact structure:
{
  "errorType": "${errorClass}",
  "language": "${lang}",
  "file": "${file}",
  "line": "${lineNum}",
  "rootCause": "Clear 1-2 sentence academic explanation of why this error happened.",
  "exactFixCode": "The exact corrected code snippet or guard clause.",
  "preventativeTest": "An assertion or test case that proves the bug is permanently eliminated."
}`

    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai-fast',
        seed: Math.floor(Math.random() * 1000000)
      })
    })

    if (res.ok) {
      const dataText = await res.text()
      const jsonMatch = dataText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return formatDiagnosisResult(parsed, cleaned)
      }
    }
  } catch (_) {
    // Offline / fallback path
  }

  return formatDiagnosisResult(curated, cleaned)
}

function getCuratedDiagnosis(errorClass, lang, file, lineNum, details, fullText) {
  if (/IndexError/i.test(errorClass) || /ArrayIndexOutOfBounds/i.test(errorClass)) {
    return {
      errorType: 'IndexError: Array/List Subscript Out of Bounds',
      language: lang || 'Python',
      file,
      line: lineNum,
      rootCause: `Attempted to access index that exceeds collection length. In 0-indexed structures, the highest accessible element is len(arr) - 1.`,
      exactFixCode: `# Guard against boundary overflow:\nif 0 <= index < len(data):\n    value = data[index]\nelse:\n    value = None  # Or safe fallback`,
      preventativeTest: `assert len(data) > target_index, f"Invalid index {target_index} for len {len(data)}"`
    }
  }

  if (/NullPointer/i.test(errorClass)) {
    return {
      errorType: 'NullPointerException (Null Dereference Hazard)',
      language: 'Java',
      file,
      line: lineNum,
      rootCause: `Invoking an instance method or accessing a field on an uninitialized object reference pointing to null.`,
      exactFixCode: `// Use Optional or explicit null defensive guard:\nOptional.ofNullable(targetObject)\n    .map(Target::getProperty)\n    .orElse("DEFAULT_VAL");`,
      preventativeTest: `Objects.requireNonNull(targetObject, "Dependency or bean reference must not be null");`
    }
  }

  if (/ZeroDivision/i.test(errorClass)) {
    return {
      errorType: 'ZeroDivisionError: Arithmetic Division by Zero',
      language: 'Python',
      file,
      line: lineNum,
      rootCause: `Denominator evaluated to zero in integer or float division operation, causing an unhandled CPU arithmetic trap.`,
      exactFixCode: `result = (numerator / denominator) if denominator != 0 else 0.0`,
      preventativeTest: `assert denominator != 0, "Arithmetic invariant violated: denominator cannot be zero"`
    }
  }

  if (/Segmentation/i.test(errorClass)) {
    return {
      errorType: 'Segmentation Fault (SIGSEGV): Illegal Memory Access',
      language: 'C/C++',
      file,
      line: lineNum,
      rootCause: `Process attempted to access a memory address not mapped in its virtual address space (e.g. dereferencing NULL or dangling pointer).`,
      exactFixCode: `if (ptr == NULL) {\n    fprintf(stderr, "Error: Null pointer encountered.\\n");\n    return -1;\n}`,
      preventativeTest: `assert(ptr != NULL && "Memory safety invariant: pointer must not be NULL");`
    }
  }

  if (/KeyError/i.test(errorClass)) {
    return {
      errorType: `KeyError: Dictionary Key Not Found`,
      language: 'Python',
      file,
      line: lineNum,
      rootCause: `The requested dictionary key does not exist in the hash table mappings.`,
      exactFixCode: `value = my_dict.get(key, default_fallback_value)`,
      preventativeTest: `assert key in my_dict, f"Schema invariant violated: missing required key '{key}'"`
    }
  }

  return {
    errorType: errorClass || 'Runtime Execution Anomaly',
    language: lang,
    file,
    line: lineNum,
    rootCause: `Unhandled runtime exception encountered during execution: ${details || 'Uncaught failure'}.`,
    exactFixCode: `try:\n    # Protected execution block\n    execute_operation()\nexcept Exception as e:\n    logger.error(f"Handled error: {e}")`,
    preventativeTest: `assert operation_result is not None, "Execution invariant failed"`
  }
}

function formatDiagnosisResult(diag, rawText) {
  const timestamp = new Date().toLocaleString()
  const cleanType = (diag.errorType || 'RuntimeError').replace(/[^a-zA-Z0-9_-]/g, '_')

  const markdownReport = `# 🚨 ACHARYA ZERO-CLICK ERROR AUTOPSY REPORT
**Error Classification:** ${diag.errorType}  
**Programming Language:** ${diag.language}  
**Timestamp:** ${timestamp}  
**Culprit Target:** \`${diag.file}\` (Line: ${diag.line})  
**Environment:** Acharya OS Ambient Sentry (Autonomous Debugger)  

---

## 📌 1. Root Cause Analysis
${diag.rootCause}

---

## ⚡ 2. Exact Remediation (One-Line / Drop-in Fix)
\`\`\`${diag.language.toLowerCase()}
${diag.exactFixCode}
\`\`\`

---

## 🧪 3. Preventative Unit Test Harness
To mathematically prevent this bug from reoccurring during university lab testing, enforce this invariant:
\`\`\`${diag.language.toLowerCase()}
${diag.preventativeTest}
\`\`\`

---

## 📋 4. Original Stack Trace
\`\`\`
${rawText}
\`\`\`

---
*Generated ambiently by Acharya OS Zero-Click Error Doctor. Saved directly to Windows Desktop.*
`

  return {
    ...diag,
    rawText,
    timestamp,
    filename: `Acharya_Debug_Report_${cleanType}.md`,
    markdownReport
  }
}
