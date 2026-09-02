import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { searchService, SEARCH_ENTITY_TYPES } from '../../services/searchService';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import {
  Search,
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  Sparkles,
  Plus,
  Calendar,
  Upload,
  UserPlus,
  Clock,
  X,
  User,
} from 'lucide-react';

const RECENT_SEARCHES_KEY = 'socialdesk_recent_searches';

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { role: userRole } = useAuth();
  const isClient = userRole === ROLES.CLIENT;

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedQuery = useDebounce(searchTerm, 200);
  const [results, setResults] = useState({
    clients: [],
    projects: [],
    tasks: [],
    content: [],
    assets: [],
    teamMembers: [],
    totalResults: 0,
  });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {
      setRecentSearches([]);
    }
  }, [isOpen]);

  // Global Keyboard Listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search logic execution
  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim()) {
        setResults({ clients: [], projects: [], tasks: [], content: [], assets: [], teamMembers: [], totalResults: 0 });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await searchService.globalSearch(debouncedQuery);
        setResults(data);

        // Save to recent searches
        saveRecentSearch(debouncedQuery.trim());
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [debouncedQuery]);

  const saveRecentSearch = (query) => {
    if (!query) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handleSelectResult = (path) => {
    onClose();
    navigate(path);
  };

  const getEntityIcon = (type) => {
    switch (type) {
      case SEARCH_ENTITY_TYPES.CLIENT:
        return <Users className="w-4 h-4 text-indigo-600" />;
      case SEARCH_ENTITY_TYPES.PROJECT:
        return <FolderKanban className="w-4 h-4 text-blue-600" />;
      case SEARCH_ENTITY_TYPES.TASK:
        return <CheckSquare className="w-4 h-4 text-emerald-600" />;
      case SEARCH_ENTITY_TYPES.CONTENT:
        return <FileText className="w-4 h-4 text-purple-600" />;
      case SEARCH_ENTITY_TYPES.ASSET:
        return <ImageIcon className="w-4 h-4 text-amber-600" />;
      case SEARCH_ENTITY_TYPES.TEAM_MEMBER:
        return <User className="w-4 h-4 text-cyan-600" />;
      default:
        return <Search className="w-4 h-4 text-slate-500" />;
    }
  };

  // PERMISSION-SCOPED QUICK ACTIONS LIST
  const QUICK_ACTIONS = [
    { label: 'Create Content', path: '/workspace/content', icon: Plus, allowed: true },
    { label: 'Schedule Content', path: '/workspace/calendar', icon: Calendar, allowed: true },
    { label: 'Upload Asset', path: '/workspace/assets', icon: Upload, allowed: true },
    { label: 'Create Task', path: '/workspace/tasks', icon: CheckSquare, allowed: !isClient },
    { label: 'Create Project', path: '/workspace/projects', icon: FolderKanban, allowed: !isClient },
    { label: 'Add Client', path: '/workspace/clients', icon: UserPlus, allowed: !isClient },
  ].filter((a) => a.allowed);

  const resultSections = [
    { title: 'Content', items: results.content },
    { title: 'Clients', items: results.clients },
    { title: 'Tasks', items: results.tasks },
    { title: 'Projects', items: results.projects },
    { title: 'Assets', items: results.assets },
    { title: 'Team Members', items: results.teamMembers },
  ];

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Global Agency Search (Ctrl + K)" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Search Input Box */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            autoFocus
            placeholder="Search across Clients, Projects, Tasks, Content, Assets & Team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* DEFAULT VIEW: QUICK ACTIONS & RECENT SEARCHES */}
        {!searchTerm && (
          <div className="space-y-4 pt-1">
            {/* Quick Actions Grid */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" /> Quick Actions
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QUICK_ACTIONS.map((act, idx) => {
                  const IconComp = act.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectResult(act.path)}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/70 rounded-xl border border-slate-200/80 hover:border-indigo-300 transition-all flex items-center gap-2.5 text-left cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:border-indigo-300 shadow-2xs">
                        <IconComp className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent Searches Log */}
            {recentSearches.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Recent Searches
                  </span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchTerm(query)}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-semibold border border-slate-200 cursor-pointer transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEARCH RESULTS VIEW */}
        {searchTerm && (
          <div className="max-h-96 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">Searching agency records...</div>
            ) : results.totalResults === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                No matching results found for "{searchTerm}".
              </div>
            ) : (
              resultSections.map((sec) => {
                if (sec.items.length === 0) return null;
                return (
                  <div key={sec.title} className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-1">
                      {sec.title} ({sec.items.length})
                    </span>
                    <div className="space-y-1">
                      {sec.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item.path)}
                          className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-100 hover:border-indigo-200 transition-all flex items-center justify-between cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs group-hover:border-indigo-300">
                              {getEntityIcon(item.type)}
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-700">{item.title}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{item.subtitle}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                              {item.type}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
