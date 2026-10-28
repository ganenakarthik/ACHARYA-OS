/* ================================================================
   PDF & DOCUMENT STUDY ENGINE
   Lightweight Client-Side Text Extraction & Concept Synthesis
   ================================================================ */

export async function extractDocumentText(file) {
  if (!file) return ''

  const name = file.name.toLowerCase()
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json') || name.endsWith('.js') || name.endsWith('.py') || name.endsWith('.ts') || name.endsWith('.java')) {
    return await file.text()
  }

  if (name.endsWith('.pdf')) {
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let str = ''
      const chunkSize = 8192
      for (let i = 0; i < bytes.length; i += chunkSize) {
        str += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.length)))
      }

      // Extract text inside Tj and TJ operators
      const textMatches = []
      const tjRegex = /\(([^)]+)\)\s*Tj/g
      let match
      while ((match = tjRegex.exec(str)) !== null) {
        textMatches.push(match[1])
      }

      const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g
      while ((match = tjArrayRegex.exec(str)) !== null) {
        const inner = match[1].replace(/\(([^)]+)\)/g, '$1 ')
        textMatches.push(inner)
      }

      if (textMatches.length > 5) {
        return textMatches.join(' ').replace(/\\([()\\])/g, '$1').replace(/\s+/g, ' ').trim()
      }

      // Fallback: extract clean printable prose sequences
      const asciiWords = str.match(/[A-Za-z0-9,.:;?!'()/\- ]{4,}/g) || []
      const cleaned = asciiWords
        .filter(w => !w.includes('endobj') && !w.includes('xref') && !w.includes('Filter') && !w.includes('FlateDecode') && !w.includes('stream'))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      return cleaned.slice(0, 15000) || `Document: ${file.name}`
    } catch (e) {
      console.warn('PDF stream extraction notice:', e)
      return `Loaded document: ${file.name}`
    }
  }

  return await file.text()
}

export function generateStudyGuideFromText(text, docName = 'Document') {
  if (!text || text.length < 20) {
    return {
      summary: `Analyzed ${docName}. Review core terminology and principles.`,
      flashcards: [
        { q: `What is the primary subject of ${docName}?`, a: 'Fundamental concepts, system architecture and core workflows.' }
      ]
    }
  }

  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 220)

  const topSentences = sentences.slice(0, 4)
  const summary = topSentences.length > 0 
    ? topSentences.join(' ')
    : text.slice(0, 240) + '...'

  const flashcards = (sentences.length >= 3 ? sentences.slice(0, 3) : [text.slice(0, 100)]).map((s, idx) => ({
    q: `Key Concept #${idx + 1} (${docName})`,
    a: s
  }))

  return { summary, flashcards }
}
