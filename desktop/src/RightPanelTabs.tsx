import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Activity, Shield, Plus, Trash2, ExternalLink, BookOpen, Wrench, Lightbulb, User } from 'lucide-react';

interface Resource {
  title: string;
  type: string;
  url: string;
}

interface Mission {
  mission: string;
  curated_resources?: Resource[];
}

interface Props {
  mission: Mission | null;
  visualContext: string;
  isSpeaking: boolean;
  privacy: Record<string, boolean>;
  setPrivacy: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  logs: string[];
  wsRef: React.RefObject<WebSocket | null>;
}

const STORAGE_KEY = 'acharya_my_resources';

const TYPE_META: Record<string, { color: string; icon: JSX.Element; border: string }> = {
  Idea:   { color: 'text-purple-300 bg-purple-950/40',  border: 'border-purple-500/50', icon: <Lightbulb size={12} /> },
  Story:  { color: 'text-amber-300 bg-amber-950/40',    border: 'border-amber-500/50',  icon: <BookOpen size={12} /> },
  Tool:   { color: 'text-emerald-300 bg-emerald-950/40',border: 'border-emerald-500/50',icon: <Wrench size={12} /> },
  Mentor: { color: 'text-cyan-300 bg-cyan-950/40',      border: 'border-cyan-500/50',   icon: <User size={12} /> },
};

const TABS = [
  { id: 'acharya', label: 'ACHARYA Picks', glow: 'text-amber-400 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  { id: 'mine',    label: 'My Resources',  glow: 'text-purple-400 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]' },
  { id: 'system',  label: 'System',        glow: 'text-cyan-400 border-cyan-500/60 shadow-[0_0_12px_rgba(0,243,255,0.3)]' },
];

function ResourceCard({ res, onDelete }: { res: Resource; onDelete?: () => void }) {
  const meta = TYPE_META[res.type] ?? TYPE_META['Idea'];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="group relative bg-black/60 border border-white/10 hover:border-white/25 rounded-xl p-3 transition-all"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${meta.color} ${meta.border}`}>
          {meta.icon} {res.type}
        </span>
        <div className="flex items-center gap-1">
          {res.url && (
            <a
              href={res.url}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-white/30 hover:text-cyan-400 transition-colors rounded"
            >
              <ExternalLink size={11} />
            </a>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-white/20 hover:text-red-400 transition-colors rounded opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
      <p className="text-white/85 text-[11px] font-medium leading-snug">{res.title}</p>
      {res.url && (
        <p className="text-white/25 text-[9px] mt-1 truncate">{res.url}</p>
      )}
    </motion.div>
  );
}

export default function RightPanelTabs({ mission, visualContext, isSpeaking, privacy, setPrivacy, logs, wsRef }: Props) {
  const [activeTab, setActiveTab] = useState<'acharya' | 'mine' | 'system'>('acharya');

  // My Resources state (persisted in localStorage)
  const [myResources, setMyResources] = useState<Resource[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [addTitle, setAddTitle] = useState('');
  const [addType, setAddType] = useState('Idea');
  const [addUrl, setAddUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const saveResources = (list: Resource[]) => {
    setMyResources(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleAdd = () => {
    if (!addTitle.trim()) return;
    const next = [{ title: addTitle.trim(), type: addType, url: addUrl.trim() }, ...myResources];
    saveResources(next);
    setAddTitle(''); setAddUrl(''); setAddType('Idea'); setShowAddForm(false);
  };

  const handleDelete = (idx: number) => {
    saveResources(myResources.filter((_, i) => i !== idx));
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
              activeTab === tab.id
                ? `${tab.glow} bg-white/5`
                : 'text-white/30 border-white/10 hover:text-white/60 hover:border-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-3 mt-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent shrink-0" />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-2 min-h-0">
        <AnimatePresence mode="wait">

          {/* ── Tab 1: ACHARYA Picks ─────────────────────────────────── */}
          {activeTab === 'acharya' && (
            <motion.div
              key="acharya"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-3"
            >
              {/* Mentor quote */}
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl px-3 py-2.5">
                <p className="text-amber-400 text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Compass size={11} /> ACHARYA Curator
                </p>
                <p className="text-amber-200/70 text-[10px] italic leading-snug">
                  "Curated for your growth — hyper-personalized to your goal & domain."
                </p>
              </div>

              {mission?.curated_resources && mission.curated_resources.length > 0 ? (
                <AnimatePresence>
                  {mission.curated_resources.map((res, i) => (
                    <ResourceCard key={i} res={res} />
                  ))}
                </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Compass size={18} className="text-amber-400/60" />
                  </div>
                  <p className="text-white/30 text-[10px]">ACHARYA is curating resources…</p>
                  <p className="text-white/20 text-[9px]">Speak or type a command to start</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Tab 2: My Resources ──────────────────────────────────── */}
          {activeTab === 'mine' && (
            <motion.div
              key="mine"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-3"
            >
              {/* Add button */}
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

              {/* Add Form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3 flex flex-col gap-2.5">
                      <input
                        type="text"
                        value={addTitle}
                        onChange={e => setAddTitle(e.target.value)}
                        placeholder="Title / Description..."
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 transition-all"
                      />
                      <div className="flex gap-2">
                        {['Idea', 'Story', 'Tool', 'Mentor'].map(t => (
                          <button
                            key={t}
                            onClick={() => setAddType(t)}
                            className={`flex-1 py-1 rounded-lg text-[9px] font-black border transition-all ${
                              addType === t
                                ? `${TYPE_META[t].color} ${TYPE_META[t].border}`
                                : 'text-white/30 border-white/10 hover:border-white/25'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={addUrl}
                        onChange={e => setAddUrl(e.target.value)}
                        placeholder="URL (optional)..."
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/70 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all"
                      />
                      <button
                        onClick={handleAdd}
                        disabled={!addTitle.trim()}
                        className={`w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                          addTitle.trim()
                            ? 'bg-purple-500/30 border-purple-400/60 text-purple-200 hover:bg-purple-500/40'
                            : 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
                        }`}
                      >
                        Save Resource
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Resource List */}
              {myResources.length > 0 ? (
                <AnimatePresence>
                  {myResources.map((res, i) => (
                    <ResourceCard key={i + res.title} res={res} onDelete={() => handleDelete(i)} />
                  ))}
                </AnimatePresence>
              ) : !showAddForm && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Plus size={18} className="text-purple-400/60" />
                  </div>
                  <p className="text-white/30 text-[10px]">No resources yet</p>
                  <p className="text-white/20 text-[9px]">Add links, ideas, tools or mentors you want to track</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Tab 3: System ────────────────────────────────────────── */}
          {activeTab === 'system' && (
            <motion.div
              key="system"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-3"
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
                    <button
                      key={flag}
                      onClick={() => {
                        const newVal = !val;
                        setPrivacy(prev => ({ ...prev, [flag]: newVal }));
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify({ type: 'privacy_toggle', flag, value: newVal }));
                        }
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[9px] font-black transition-all ${
                        val
                          ? 'bg-green-500/15 border-green-500/40 text-green-300'
                          : 'bg-red-500/10 border-red-500/25 text-red-400/70'
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
                <h2 className="text-white/40 font-bold tracking-widest text-[10px] uppercase mb-2">
                  System Logs
                </h2>
                <div className="font-mono text-[9px] space-y-1 h-20 overflow-y-auto flex flex-col justify-end custom-scrollbar">
                  {logs.map((log, i) => (
                    <motion.div
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} key={i + log}
                      className={
                        log.includes('[ERROR]') ? 'text-red-400' :
                        log.includes('[USER]') ? 'text-purple-300 font-bold' :
                        log.includes('[ACHARYA]') ? 'text-amber-300 font-bold' :
                        log.includes('[PRIVACY]') ? 'text-green-400' : 'text-cyan-400/70'
                      }
                    >
                      {log}
                    </motion.div>
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
