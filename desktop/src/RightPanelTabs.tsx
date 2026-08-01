import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Activity, Shield, Plus, Trash2, ExternalLink,
  BookOpen, Wrench, Lightbulb, User, Rss, RefreshCw, Loader
} from 'lucide-react';

interface Resource {
  title: string;
  type: string;
  url: string;
}

interface Mission {
  mission: string;
  curated_resources?: Resource[];
  explainability?: {
    why: string;
    evidence: string;
    impact: string;
    confidence: string;
  };
}

interface Props {
  mission: Mission | null;
  visualContext: string;
  isSpeaking: boolean;
  privacy: Record<string, boolean>;
  setPrivacy: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  logs: string[];
  wsRef: React.RefObject<WebSocket | null>;
  identityTwin: {
    ideal_self: string;
    momentum: number;
    identity_gap: string;
    actions_completed: number;
  } | null;
}

const STORAGE_KEY = 'acharya_my_resources';
const DOMAIN_KEY  = 'acharya_onboard_domain';

// ── Domain → HN search keywords & display label ─────────────────────────────
const DOMAIN_KEYWORDS: Record<string, { terms: string[]; label: string; color: string }> = {
  'Startup':    { terms: ['startup','founder','YC','launch','seed','vc','series a','product hunt'], label: '🚀 Startup', color: 'text-orange-400' },
  'AI / ML':    { terms: ['AI','LLM','GPT','machine learning','deep learning','llama','openai','anthropic'], label: '🤖 AI / ML', color: 'text-cyan-400' },
  'Coding':     { terms: ['open source','github','developer','programming','react','typescript','python','rust'], label: '💻 Coding', color: 'text-emerald-400' },
  'Hackathon':  { terms: ['hackathon','buildathon','devpost','competition','prize','48 hours'], label: '🏆 Hackathon', color: 'text-yellow-400' },
  'Product':    { terms: ['product','SaaS','launch','UX','design','feature','roadmap','GTM'], label: '📦 Product', color: 'text-purple-400' },
  'Exam Prep':  { terms: ['study','exam','certification','GATE','competitive','learning','course'], label: '📚 Exam Prep', color: 'text-blue-400' },
};

const DEFAULT_DOMAIN = 'Startup';

interface NewsItem {
  id: number;
  title: string;
  url: string;
  score: number;
  by: string;
  time: number;
}

// ── Hook: fetch HackerNews top stories filtered by domain keywords ────────────
function useDomainNews(domain: string) {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const keywords = (DOMAIN_KEYWORDS[domain] ?? DOMAIN_KEYWORDS[DEFAULT_DOMAIN]).terms;
      // Fetch top 200 story IDs from HN
      const idsRes  = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const ids: number[] = await idsRes.json();
      const top50 = ids.slice(0, 100);

      // Fetch stories in parallel (batches of 10)
      const batches: number[][] = [];
      for (let i = 0; i < top50.length; i += 10) batches.push(top50.slice(i, i + 10));

      const stories: NewsItem[] = [];
      for (const batch of batches) {
        const items = await Promise.all(
          batch.map(id =>
            fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
          )
        );
        for (const item of items) {
          if (!item?.title || !item?.url) continue;
          const titleLower = item.title.toLowerCase();
          if (keywords.some(kw => titleLower.includes(kw.toLowerCase()))) {
            stories.push(item as NewsItem);
          }
        }
        if (stories.length >= 6) break;
      }
      setNews(stories.slice(0, 6));
    } catch {
      setError('Could not load news.');
    }
    setLoading(false);
  }, [domain]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  return { news, loading, error, refresh: fetchNews };
}

// ── Type-to-style mapping ────────────────────────────────────────────────────
const TYPE_META: Record<string, { color: string; icon: JSX.Element; border: string }> = {
  Idea:   { color: 'text-purple-300 bg-purple-950/40',  border: 'border-purple-500/50', icon: <Lightbulb size={12} /> },
  Story:  { color: 'text-amber-300 bg-amber-950/40',    border: 'border-amber-500/50',  icon: <BookOpen size={12} /> },
  Tool:   { color: 'text-emerald-300 bg-emerald-950/40',border: 'border-emerald-500/50',icon: <Wrench size={12} /> },
  Mentor: { color: 'text-cyan-300 bg-cyan-950/40',      border: 'border-cyan-500/50',   icon: <User size={12} /> },
};

const TABS = [
  { id: 'acharya', label: 'Curator', glow: 'text-amber-400 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  { id: 'goals',   label: 'Directives', glow: 'text-cyan-400 border-cyan-500/60 shadow-[0_0_12px_rgba(0,243,255,0.3)]' },
  { id: 'mine',    label: 'Bookmarks',  glow: 'text-purple-400 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]' },
  { id: 'system',  label: 'System',     glow: 'text-zinc-400 border-zinc-500/60 shadow-[0_0_12px_rgba(150,150,150,0.15)]' },
];

// ── Resource card (ACHARYA curated & user-added) ─────────────────────────────
function ResourceCard({ res, onDelete }: { res: Resource; onDelete?: () => void }) {
  const meta = TYPE_META[res.type] ?? TYPE_META['Idea'];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
      className="group relative bg-black/60 border border-white/10 hover:border-white/25 rounded-xl p-3 transition-all"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${meta.color} ${meta.border}`}>
          {meta.icon} {res.type}
        </span>
        <div className="flex items-center gap-1">
          {res.url && (
            <a href={res.url} target="_blank" rel="noreferrer" className="p-1 text-white/30 hover:text-cyan-400 transition-colors rounded">
              <ExternalLink size={11} />
            </a>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1 text-white/20 hover:text-red-400 transition-colors rounded opacity-0 group-hover:opacity-100">
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
      <p className="text-white/85 text-[11px] font-medium leading-snug">{res.title}</p>
      {res.url && <p className="text-white/25 text-[9px] mt-1 truncate">{res.url}</p>}
    </motion.div>
  );
}

// ── News card (HackerNews live feed) ────────────────────────────────────────
function NewsCard({ item }: { item: NewsItem }) {
  const ago = Math.round((Date.now() / 1000 - item.time) / 3600);
  return (
    <motion.a
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      href={item.url} target="_blank" rel="noreferrer"
      className="group block bg-black/50 border border-white/8 hover:border-orange-500/40 rounded-xl p-3 transition-all"
    >
      <p className="text-white/85 text-[11px] font-medium leading-snug group-hover:text-orange-200 transition-colors line-clamp-2">
        {item.title}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[8px] text-orange-400/60 font-bold">▲ {item.score}</span>
        <span className="text-[8px] text-white/20">by {item.by}</span>
        <span className="text-[8px] text-white/20 ml-auto">{ago}h ago</span>
        <ExternalLink size={9} className="text-white/20 group-hover:text-orange-400 transition-colors" />
      </div>
    </motion.a>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function RightPanelTabs({ mission, visualContext, isSpeaking, privacy, setPrivacy, logs, wsRef, identityTwin }: Props) {
  const [activeTab, setActiveTab] = useState<'acharya' | 'goals' | 'mine' | 'system'>('acharya');

  // Read domain from localStorage (saved during onboarding)
  const domain = (() => {
    try {
      const raw = localStorage.getItem('acharya_onboard_domain') || DEFAULT_DOMAIN;
      return raw || DEFAULT_DOMAIN;
    } catch { return DEFAULT_DOMAIN; }
  })();

  const domainMeta = DOMAIN_KEYWORDS[domain] ?? DOMAIN_KEYWORDS[DEFAULT_DOMAIN];
  const { news, loading: newsLoading, error: newsError, refresh } = useDomainNews(domain);

  // My Resources state (persisted in localStorage)
  const [myResources, setMyResources] = useState<Resource[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [addTitle, setAddTitle]   = useState('');
  const [addType,  setAddType]    = useState('Idea');
  const [addUrl,   setAddUrl]     = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const saveResources = (list: Resource[]) => {
    setMyResources(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleAdd = () => {
    if (!addTitle.trim()) return;
    saveResources([{ title: addTitle.trim(), type: addType, url: addUrl.trim() }, ...myResources]);
    setAddTitle(''); setAddUrl(''); setAddType('Idea'); setShowAddForm(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-0 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all duration-200 ${
              activeTab === tab.id ? `${tab.glow} bg-white/5` : 'text-white/30 border-white/10 hover:text-white/60 hover:border-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mx-3 mt-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0" />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-2 min-h-0">
        <AnimatePresence mode="wait">

          {/* ── Tab 1: ACHARYA Picks ─────────────────────────────────── */}
          {activeTab === 'acharya' && (
            <motion.div key="acharya"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }} className="flex flex-col gap-3"
            >
              {/* ── Curated Resources & Thought Stream ── */}
              <div className="flex flex-col gap-2">
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl px-3 py-2.5">
                  <p className="text-amber-400 text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Compass size={11} /> ACHARYA Curator · {domainMeta.label}
                  </p>
                  <p className="text-amber-200/60 text-[10px] italic leading-snug">
                    "Hyper-personalized to your goal &amp; domain."
                  </p>
                </div>

                {mission?.explainability?.why && (
                  <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl px-3 py-2.5">
                    <p className="text-cyan-400 text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 animate-pulse">
                      <Activity size={11} className="text-cyan-400" /> JARVIS Thought Stream
                    </p>
                    <p className="text-cyan-200/80 text-[10px] font-mono leading-relaxed break-words">
                      &gt; "{mission.explainability.why}"
                    </p>
                    {mission.explainability.evidence && (
                      <p className="text-white/20 text-[8px] mt-1 truncate">
                        Evidence: {mission.explainability.evidence}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {mission?.curated_resources && mission.curated_resources.length > 0 ? (
                <AnimatePresence>
                  {mission.curated_resources.map((res, i) => <ResourceCard key={i} res={res} />)}
                </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center gap-2 py-5 text-center">
                  <Compass size={18} className="text-amber-400/40" />
                  <p className="text-white/25 text-[10px]">Curating resources for you…</p>
                </div>
              )}

              {/* ── Live Domain News Feed ── */}
              <div className="mt-1">
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${domainMeta.color}`}>
                    <Rss size={10} /> Live {domainMeta.label} News
                  </p>
                  <button
                    onClick={refresh}
                    className="p-1 text-white/20 hover:text-white/60 transition-colors rounded"
                    title="Refresh news"
                  >
                    <RefreshCw size={11} className={newsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {newsLoading && (
                  <div className="flex items-center justify-center gap-2 py-6 text-white/30">
                    <Loader size={14} className="animate-spin" />
                    <span className="text-[10px]">Fetching latest news…</span>
                  </div>
                )}

                {!newsLoading && newsError && (
                  <p className="text-red-400/60 text-[9px] py-3 text-center">{newsError}</p>
                )}

                {!newsLoading && !newsError && news.length === 0 && (
                  <p className="text-white/25 text-[9px] py-3 text-center">No matching news found right now.</p>
                )}

                {!newsLoading && news.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <AnimatePresence>
                      {news.map(item => <NewsCard key={item.id} item={item} />)}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Tab 2: Directives (Active Goals & Planner Roadmaps) ── */}
          {activeTab === 'goals' && (
            <motion.div key="goals"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }} className="flex flex-col gap-3.5"
            >
              {/* Identity Twin & Momentum Card */}
              <div className="bg-gradient-to-br from-cyan-950/20 via-black/40 to-purple-950/20 border border-cyan-500/25 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 rounded-full blur-xl pointer-events-none" />
                
                <h3 className="text-cyan-400 text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <User size={11} /> Identity Twin Directive
                </h3>
                
                {/* Target Self */}
                <div className="mb-3.5">
                  <p className="text-white/40 text-[8px] uppercase tracking-wider">Aspiration Profile</p>
                  <p className="text-white text-[13px] font-black tracking-wide leading-tight drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]">
                    {identityTwin?.ideal_self || "Evolving Growth Candidate"}
                  </p>
                </div>

                {/* Progress Gap Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-wider mb-1.5">
                    <span className="text-purple-300">Identity Gap Alignment</span>
                    <span className="text-purple-400">{identityTwin?.identity_gap || "50% Remaining"}</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-purple-500/10">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-1000"
                      style={{ width: `${100 - parseInt(identityTwin?.identity_gap || '50')}%` }}
                    />
                  </div>
                </div>

                {/* Momentum Dial Indicator */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3">
                  <div>
                    <p className="text-white/40 text-[8px] uppercase tracking-wider">Momentum Level</p>
                    <p className="text-[11px] font-black text-cyan-300 uppercase tracking-widest mt-0.5">
                      {identityTwin && identityTwin.momentum >= 8 ? "🔥 Peak Flow State" : identityTwin && identityTwin.momentum >= 5 ? "⚡ Steady Progress" : "💤 Focus Required"}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[18px] font-black text-cyan-300 tabular-nums drop-shadow-[0_0_8px_rgba(0,243,255,0.4)]">
                      {identityTwin?.momentum || 7}
                    </span>
                    <span className="text-white/30 text-[9px]">/10</span>
                  </div>
                </div>
              </div>

              {/* Action Plan Roadmaps Card */}
              <div className="bg-black/50 border border-white/8 rounded-2xl p-3.5">
                <h3 className="text-white/85 text-[9.5px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Compass size={11} className="text-purple-400" /> Active Roadmap Phases
                </h3>

                {mission?.plan_phases && mission.plan_phases.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {mission.plan_phases.map((phase: any, idx: number) => (
                      <div key={idx} className="bg-black/60 border border-white/5 rounded-xl p-2.5 flex gap-2.5 items-start hover:border-purple-500/20 transition-all">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 shrink-0">
                          {phase.phase}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/90 text-[10.5px] font-bold leading-tight truncate">{phase.title}</p>
                          <p className="text-white/50 text-[9.5px] leading-normal mt-0.5">{phase.task}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-7 border border-dashed border-white/5 rounded-xl">
                    <p className="text-white/25 text-[10px]">No active learning roadmap loaded.</p>
                    <p className="text-white/15 text-[8.5px] mt-1 font-mono">Type 'plan python exam' to create one</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Tab 3: Bookmarks ──────────────────────────────────── */}
          {activeTab === 'mine' && (
            <motion.div key="mine"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }} className="flex flex-col gap-3"
            >
              <button
                onClick={() => setShowAddForm(v => !v)}
                className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  showAddForm
                    ? 'bg-purple-500/20 border-purple-400/60 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'bg-white/5 border-white/15 text-white/50 hover:border-purple-400/40 hover:text-purple-300'
                }`}
              >
                <Plus size={12} /> {showAddForm ? 'Cancel' : 'Add My Resource'}
              </button>

              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3 flex flex-col gap-2.5">
                      <input
                        type="text" value={addTitle} onChange={e => setAddTitle(e.target.value)}
                        placeholder="Title / Description..."
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 transition-all"
                      />
                      <div className="flex gap-2">
                        {['Idea', 'Story', 'Tool', 'Mentor'].map(t => (
                          <button key={t} onClick={() => setAddType(t)}
                            className={`flex-1 py-1 rounded-lg text-[9px] font-black border transition-all ${
                              addType === t ? `${TYPE_META[t].color} ${TYPE_META[t].border}` : 'text-white/30 border-white/10 hover:border-white/25'
                            }`}
                          >{t}</button>
                        ))}
                      </div>
                      <input
                        type="text" value={addUrl} onChange={e => setAddUrl(e.target.value)}
                        placeholder="URL (optional)..."
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/70 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all"
                      />
                      <button onClick={handleAdd} disabled={!addTitle.trim()}
                        className={`w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                          addTitle.trim()
                            ? 'bg-purple-500/30 border-purple-400/60 text-purple-200 hover:bg-purple-500/40'
                            : 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
                        }`}
                      >Save Resource</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {myResources.length > 0 ? (
                <AnimatePresence>
                  {myResources.map((res, i) => (
                    <ResourceCard key={i + res.title} res={res} onDelete={() => saveResources(myResources.filter((_, j) => j !== i))} />
                  ))}
                </AnimatePresence>
              ) : !showAddForm && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Plus size={18} className="text-purple-400/60" />
                  </div>
                  <p className="text-white/30 text-[10px]">No resources yet</p>
                  <p className="text-white/20 text-[9px]">Add links, ideas, tools or mentors to track</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Tab 3: System ────────────────────────────────────────── */}
          {activeTab === 'system' && (
            <motion.div key="system"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }} className="flex flex-col gap-3"
            >
              {/* Screen Context */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 overflow-hidden relative">
                {isSpeaking && <motion.div className="absolute inset-0 bg-cyan-400/10 animate-pulse" />}
                <h2 className="text-cyan-400 font-bold tracking-widest text-[10px] uppercase mb-2 flex items-center gap-2 relative z-10">
                  <Activity size={12} /> Screen Context
                </h2>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f3ff] ${isSpeaking ? 'animate-ping' : 'animate-pulse'}`} />
                    <p className="text-white/60 text-[9px] uppercase tracking-wider">Vision Analyzer Active</p>
                  </div>
                  <div className="bg-black/60 rounded-lg p-2 font-mono text-[9px] text-cyan-300 border border-cyan-500/20 h-20 overflow-y-auto custom-scrollbar">
                    &gt; {visualContext || "Scanning visual data stream..."}
                  </div>
                </div>
              </div>

              {/* Privacy */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                <h2 className="text-white/60 font-bold tracking-widest text-[10px] uppercase mb-2.5 flex items-center gap-2">
                  <Shield size={12} className="text-green-400" /> Privacy Controls
                </h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(privacy).map(([flag, val]) => (
                    <button key={flag}
                      onClick={() => {
                        const newVal = !val;
                        setPrivacy(prev => ({ ...prev, [flag]: newVal }));
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify({ type: 'privacy_toggle', flag, value: newVal }));
                        }
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[9px] font-black transition-all ${
                        val ? 'bg-green-500/15 border-green-500/40 text-green-300' : 'bg-red-500/10 border-red-500/25 text-red-400/70'
                      }`}
                    >
                      <span className="tracking-wider">{flag}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded ${val ? 'bg-green-500/20' : 'bg-red-500/20'}`}>{val ? 'ON' : 'OFF'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logs */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                <h2 className="text-white/40 font-bold tracking-widest text-[10px] uppercase mb-2">System Logs</h2>
                <div className="font-mono text-[9px] space-y-1 h-20 overflow-y-auto flex flex-col justify-end custom-scrollbar">
                  {logs.map((log, i) => (
                    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} key={i + log}
                      className={
                        log.includes('[ERROR]')   ? 'text-red-400' :
                        log.includes('[USER]')    ? 'text-purple-300 font-bold' :
                        log.includes('[ACHARYA]') ? 'text-amber-300 font-bold' :
                        log.includes('[PRIVACY]') ? 'text-green-400' : 'text-cyan-400/70'
                      }
                    >{log}</motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
