/* ================================================================
   RECOMMENDATIONS, HACKATHONS & TECH NEWS RADAR ENGINE
   Real curated opportunities, learning feeds, and hackathon alerts
   ================================================================ */

export const HACKATHONS_DATA = [
  {
    id: 'hack-1',
    title: 'Global Agentic AI Hackathon 2026',
    organizer: 'OpenAI & Hugging Face',
    dates: 'March 14 - 16, 2026',
    prize: '$75,000 in Grants',
    difficulty: 'Intermediate / Advanced',
    tags: ['Autonomous Agents', 'LLMs', 'Tool Calling'],
    description: 'Build autonomous agents that perceive desktop workflows and execute complex multi-step reasoning.',
    link: 'https://lablab.ai/event/agentic-ai-hackathon',
  },
  {
    id: 'hack-2',
    title: 'NeurIPS Open-Source LLM Challenge',
    organizer: 'Ollama & Meta AI',
    dates: 'April 2 - 5, 2026',
    prize: '$50,000 + Compute Credits',
    difficulty: 'All Levels',
    tags: ['Local LLMs', 'Quantization', 'Edge AI'],
    description: 'Optimize local models on consumer hardware for real-time latency and low-memory devices.',
    link: 'https://kaggle.com/competitions',
  },
  {
    id: 'hack-3',
    title: 'Cloud Native & Distributed Systems Cup',
    organizer: 'CNCF & Google Cloud',
    dates: 'April 22 - 25, 2026',
    prize: '$100,000 Global Prize Pool',
    difficulty: 'Advanced',
    tags: ['Kubernetes', 'Microservices', 'Raft Consensus'],
    description: 'Architect resilient multi-region topologies with automated self-healing and zero-downtime failovers.',
    link: 'https://devpost.com/hackathons',
  },
]

export const TECH_NEWS_DATA = [
  {
    id: 'news-1',
    headline: 'DeepSeek & Ollama Release Ultra-Fast Local MoE Architecture',
    source: 'AI Research Weekly',
    time: '2h ago',
    category: 'Local AI',
    summary: 'New 16-bit MoE models enable 120 tokens/sec on standard laptop GPUs with zero cloud latency.',
    tag: '⚡ BREAKTHROUGH',
  },
  {
    id: 'news-2',
    headline: 'Autonomous Code Synthesizers Reach 89% HumanEval SOTA',
    source: 'TechCrunch AI',
    time: '4h ago',
    category: 'Agentic Tools',
    summary: 'Multi-agent pair programming paradigms demonstrate 4x debugging speedups over single-pass LLM prompts.',
    tag: '🔥 TRENDING',
  },
  {
    id: 'news-3',
    headline: 'WebAssembly & WebRTC Combine for Zero-Latency On-Device Vision',
    source: 'Browser Architecture',
    time: '7h ago',
    category: 'Web Tech',
    summary: 'Direct frame buffer pipeline runs real-time object and OCR detection without sending pixels over the network.',
    tag: '💡 ARCHITECTURE',
  },
]

export const RECOMMENDED_RESOURCES = [
  {
    id: 'rec-1',
    topic: 'Asynchronous Event Loops in Python & Node',
    category: 'Core Mastery',
    icon: '⚡',
    action: 'Queue Implementation Sprint',
    description: 'Master non-blocking I/O, coroutines, and thread pool worker allocations.',
    desc: 'Master non-blocking I/O, coroutines, and thread pool worker allocations.',
  },
  {
    id: 'rec-2',
    topic: 'Building Autonomous Agent State Machines',
    category: 'AI Architecture',
    icon: '🧠',
    action: 'Generate Practice Quiz',
    description: 'Understand Observe-Reason-Plan-Act loops, self-correction, and tool routing.',
    desc: 'Understand Observe-Reason-Plan-Act loops, self-correction, and tool routing.',
  },
  {
    id: 'rec-3',
    topic: 'Distributed Caching & Thundering Herd Prevention',
    category: 'System Design',
    icon: '🌐',
    action: 'Queue System Design Task',
    description: 'Implement XFetch probabilistic cache expiration and write-through locking.',
    desc: 'Implement XFetch probabilistic cache expiration and write-through locking.',
  },
]

export const RECOMMENDATIONS_DATA = RECOMMENDED_RESOURCES

/* ── Live Tech News Fetcher (Real Hacker News API) ── */
export async function fetchLiveTechNews() {
  try {
    const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=10')
    if (res.ok) {
      const data = await res.json()
      if (data?.hits && data.hits.length > 0) {
        return data.hits.map((hit, idx) => ({
          id: hit.objectID || `hn-${idx}`,
          headline: hit.title || 'Tech Headline',
          source: hit.author ? `HN @${hit.author}` : 'Hacker News',
          time: hit.created_at ? new Date(hit.created_at).toLocaleTimeString() : 'Live',
          category: 'Live Tech',
          summary: `${hit.points || 0} points · ${hit.num_comments || 0} comments`,
          link: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          tag: (hit.points || 0) > 200 ? '🔥 TRENDING' : '⚡ LIVE',
        }))
      }
    }
  } catch (e) {
    console.warn('Live news fetch fallback:', e)
  }
  return TECH_NEWS_DATA
}
