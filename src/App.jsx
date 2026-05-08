import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  BookOpen, 
  ExternalLink, 
  AlertCircle, 
  Loader2, 
  Dna, 
  Database, 
  Globe, 
  Menu,
  X,
  ArrowUpRight,
  Filter,
  RefreshCcw,
  Newspaper,
  Share2,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  FileText,
  Copy,
  Check,
  Sparkles,
  Bot,
  MessageSquare,
  Send,
  XCircle,
  Minimize2,
  Maximize2,
  Printer,
  Download,
  LayoutGrid,
  FileDown
} from 'lucide-react'

// Base API URL for local FastAPI Backend
const BASE_URL = 'ncbi-backend-production.up.railway.app'

/**
 * Utility to format abstract text with sub-headers
 */
const formatAbstract = (text) => {
  if (!text) return null
  
  const sections = ['OBJECTIVE', 'METHODS', 'RESULTS', 'CONCLUSIONS', 'IMPORTANCE', 'BACKGROUND', 'DESIGN', 'SETTING', 'PARTICIPANTS', 'MAIN OUTCOME MEASURES', 'RESULTS', 'CONCLUSIONS AND RELEVANCE']
  
  // Find matches and split
  const regex = new RegExp(`(${sections.join('|')}):`, 'g')
  const parts = text.split(regex)
  
  if (parts.length === 1) return <p className="leading-relaxed mb-6">{text}</p>
  
  const formatted = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (sections.includes(part)) {
      formatted.push(<h4 key={`h-${i}`} className="text-sm font-black text-slate-900 mt-8 mb-3 uppercase tracking-widest">{part}</h4>)
    } else if (part.trim()) {
      formatted.push(<p key={`p-${i}`} className="leading-relaxed mb-4 text-slate-700">{part.trim()}</p>)
    }
  }
  
  return formatted
}

/**
 * Minimal Markdown-lite formatter for AI summaries
 */
const formatMarkdown = (text) => {
  if (!text) return null
  
  // Split by double newline for paragraphs
  const paragraphs = text.split('\n\n')
  
  return paragraphs.map((para, i) => {
    // Handle list items
    if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
      const items = para.split('\n').map(line => line.replace(/^[-*]\s+/, '').trim())
      return (
        <ul key={i} className="list-disc ml-6 mb-6 space-y-2">
          {items.map((item, j) => <li key={j}>{parseInline(item)}</li>)}
        </ul>
      )
    }
    
    return <p key={i} className="mb-6 leading-relaxed">{parseInline(para)}</p>
  })
}

/**
 * Parse inline bold **text**
 */
const parseInline = (text) => {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black text-slate-900">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

const SkeletonCard = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="h-6 bg-slate-200 rounded-lg w-3/4"></div>
      <div className="h-6 bg-slate-200 rounded-full w-24"></div>
    </div>
    <div className="space-y-3 mb-6">
      <div className="h-4 bg-slate-200 rounded w-full"></div>
      <div className="h-4 bg-slate-200 rounded w-full"></div>
    </div>
    <div className="flex justify-end pt-4">
      <div className="h-10 bg-slate-200 rounded-xl w-full"></div>
    </div>
  </div>
)

/**
 * Home Page Component
 */
const Home = ({ 
  articles, loading, error, searchTerm, setSearchTerm, searchPubMed, 
  hasSearched, lastSearched, globalLatestPaper, globalLatestLoading, 
  onRefreshLatest, resultLimit, setResultLimit,
  startDate, setStartDate, endDate, setEndDate, sortBy, setSortBy, onClearFilters,
  aiPromptVisible, setAiPromptVisible, aiChatOpen, setAiChatOpen, aiThinking, aiSummary, aiStep, aiProgress, onSummarize,
  aiWidgetMode, setAiWidgetMode,
  chatHistory, chatInput, setChatInput, handleSendMessage, chatEndRef
}) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const suggestionsRef = useRef(null)
  const debounceRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced autocomplete fetch
  const fetchSuggestions = (query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    setSuggestionLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE_URL}/suggest?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions || [])
          setShowSuggestions((data.suggestions || []).length > 0)
        }
      } catch { /* silent */ }
      finally { setSuggestionLoading(false) }
    }, 300)
  }

  const handleSearchInput = (e) => {
    const val = e.target.value
    setSearchTerm(val)
    fetchSuggestions(val)
  }

  const handleSuggestionClick = (term) => {
    setSearchTerm(term)
    setShowSuggestions(false)
    setSuggestions([])
  }

  // Quick date presets
  const applyDatePreset = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-blue-100 selection:text-blue-700 font-sans">
      {/* Premium Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200 py-3' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Dna size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">
                NCBI <span className="text-blue-600 uppercase">Pro</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-1">
                Advanced Research Hub
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-6">
              <a href="#" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Resources</a>
              <a href="#" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Archive</a>
            </nav>
            <div className="h-6 w-[1px] bg-slate-200"></div>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all">
              Live Feed
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-16 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-16 items-center">
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black bg-blue-600 text-white mb-6 uppercase tracking-widest shadow-lg shadow-blue-200">
                Professional Bio-Portal
              </div>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[0.95] mb-8">
                Next-Gen <br /> <span className="text-blue-600">Bioinformatics.</span>
              </h2>
              <p className="text-lg text-slate-500 max-w-lg mb-10 leading-relaxed font-medium">
                Real-time data synchronization with NCBI PubMed. Access clinical abstracts, journal metadata, and DOI links instantly.
              </p>

              {/* Search Console */}
              <div className="max-w-xl" ref={suggestionsRef}>
                <form onSubmit={(e) => { searchPubMed(e); setShowSuggestions(false); }} className="relative group mb-4">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Search size={22} />
                  </div>
                  <input
                    type="text"
                    placeholder="Query topic (e.g., Cancer Genomics)..."
                    className="w-full pl-12 pr-48 py-5 bg-white border-2 border-slate-100 rounded-3xl shadow-2xl shadow-slate-200/50 outline-none focus:border-blue-500 transition-all placeholder:text-slate-400 font-semibold"
                    value={searchTerm}
                    onChange={handleSearchInput}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    disabled={loading}
                    autoComplete="off"
                  />
                  <div className="absolute right-2 inset-y-0 flex items-center gap-2">
                    <select 
                      value={resultLimit}
                      onChange={(e) => setResultLimit(Number(e.target.value))}
                      className="appearance-none bg-slate-50 border border-slate-100 text-slate-600 text-xs font-black px-4 py-3 rounded-2xl outline-none hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <button 
                      type="submit"
                      disabled={loading || !searchTerm.trim()}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-blue-300 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : 'FETCH'}
                    </button>
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden z-50"
                      >
                        <div className="px-4 py-2 border-b border-slate-50">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Database size={10} />
                            PubMed Suggestions
                            {suggestionLoading && <Loader2 size={10} className="animate-spin text-blue-500" />}
                          </span>
                        </div>
                        {suggestions.map((term, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSuggestionClick(term)}
                            className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3 group/suggest"
                          >
                            <Search size={14} className="text-slate-300 group-hover/suggest:text-blue-500 shrink-0" />
                            <span className="truncate">{term}</span>
                            <ArrowUpRight size={12} className="ml-auto text-slate-200 group-hover/suggest:text-blue-400 shrink-0" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                <div className="flex items-center justify-between px-2">
                  <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${isFilterOpen ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Filter size={14} />
                    {isFilterOpen ? 'Hide Filters' : 'Advanced Filters'}
                    {(startDate || endDate || sortBy !== 'relevance') && (
                      <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[8px]">
                        {(startDate ? 1 : 0) + (endDate ? 1 : 0) + (sortBy !== 'relevance' ? 1 : 0)}
                      </span>
                    )}
                    {isFilterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  {(startDate || endDate || sortBy !== 'relevance') && (
                    <button 
                      onClick={onClearFilters}
                      className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-1"
                    >
                      <RefreshCcw size={12} />
                      Reset All
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-200/40 space-y-8">
                        
                        {/* Quick Date Presets */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Calendar size={12} className="text-blue-500" />
                            Quick Range
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: '7 Days', days: 7 },
                              { label: '30 Days', days: 30 },
                              { label: '1 Year', days: 365 },
                              { label: 'All Time', days: 0 }
                            ].map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => preset.days === 0 ? (() => { setStartDate(''); setEndDate(''); })() : applyDatePreset(preset.days)}
                                className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                                  preset.days === 0 && !startDate && !endDate
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                                    : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-blue-200 hover:text-blue-600'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Date Range */}
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
                            <input 
                              type="date" 
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
                            <input 
                              type="date" 
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Sort Order */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <LayoutGrid size={12} className="text-blue-500" />
                            Sort Results By
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              type="button"
                              onClick={() => setSortBy('relevance')}
                              className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${sortBy === 'relevance' ? 'bg-slate-900 text-white shadow-xl shadow-slate-300' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'}`}
                            >
                              <Sparkles size={14} />
                              Relevance
                            </button>
                            <button 
                              type="button"
                              onClick={() => setSortBy('latest')}
                              className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${sortBy === 'latest' ? 'bg-slate-900 text-white shadow-xl shadow-slate-300' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'}`}
                            >
                              <Calendar size={14} />
                              Latest First
                            </button>
                          </div>
                        </div>

                        {/* Active Filters Summary */}
                        {(startDate || endDate || sortBy !== 'relevance') && (
                          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-50">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active:</span>
                            {startDate && (
                              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full border border-blue-100 flex items-center gap-1">
                                From: {startDate}
                                <button onClick={() => setStartDate('')} className="hover:text-red-500 ml-1"><X size={10} /></button>
                              </span>
                            )}
                            {endDate && (
                              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full border border-blue-100 flex items-center gap-1">
                                To: {endDate}
                                <button onClick={() => setEndDate('')} className="hover:text-red-500 ml-1"><X size={10} /></button>
                              </span>
                            )}
                            {sortBy !== 'relevance' && (
                              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full border border-blue-100 flex items-center gap-1">
                                Sort: {sortBy}
                                <button onClick={() => setSortBy('relevance')} className="hover:text-red-500 ml-1"><X size={10} /></button>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Global Latest Research Card */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="relative">
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl"></div>
                <div className="relative bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden group/card">
                  {globalLatestLoading ? (
                    <div className="animate-pulse space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 rounded-2xl w-14 h-14"></div>
                        <div className="space-y-3 flex-1">
                          <div className="h-4 bg-slate-50 rounded w-1/3"></div>
                          <div className="h-3 bg-slate-50 rounded w-2/3"></div>
                        </div>
                      </div>
                      <div className="space-y-4 pt-4">
                        <div className="h-3 bg-slate-50 rounded w-full"></div>
                        <div className="h-3 bg-slate-50 rounded w-full"></div>
                        <div className="h-3 bg-slate-50 rounded w-3/4"></div>
                      </div>
                    </div>
                  ) : globalLatestPaper ? (
                    <>
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                            <Sparkles size={24} />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Live Intelligence</div>
                            <div className="text-xs font-bold text-slate-400">Latest Global Release</div>
                          </div>
                        </div>
                        <button 
                          onClick={onRefreshLatest}
                          disabled={globalLatestLoading}
                          className="w-10 h-10 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
                        >
                          <RefreshCcw size={16} className={globalLatestLoading ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      
                      <div className="space-y-6">
                        <h4 className="text-xl font-black text-slate-900 leading-tight group-hover/card:text-blue-600 transition-colors line-clamp-2">
                          {globalLatestPaper.title || 'System Synchronizing...'}
                        </h4>
                        
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                          <BookOpen size={14} className="text-blue-500" />
                          <span className="text-[10px] font-black text-slate-600 truncate uppercase tracking-widest">{globalLatestPaper.journal || 'NCBI Database'}</span>
                        </div>

                        {globalLatestPaper.abstract && (
                          <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 font-medium">
                            {globalLatestPaper.abstract}
                          </p>
                        )}
                        
                        {globalLatestPaper.pmid ? (
                          <button 
                            onClick={() => navigate(`/paper/${globalLatestPaper.pmid}`, { state: { article: globalLatestPaper } })}
                            className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group/btn"
                          >
                            Read Full Paper
                            <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                          </button>
                        ) : (
                          <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-2xl">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse">Syncing Metadata...</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-20">
                      <Bot size={48} className="mx-auto text-slate-100 mb-6" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Network Handshake Pending</p>
                      <button onClick={onRefreshLatest} className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all">Retry Synchronization</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Workspace */}
      <main className="max-w-7xl mx-auto px-6 pb-40">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-12 border-b border-slate-200 pb-10">
          <div className="flex items-center gap-4">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {hasSearched ? 'Analysis Results' : 'Research Feed'}
            </h3>
            {hasSearched && !loading && articles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  {articles.length} Papers
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                  Top {resultLimit} Analysis
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-[10px] font-black border border-green-100 uppercase tracking-widest">
              <RefreshCcw size={12} className="animate-spin-slow" />
              Live Sync Active
            </div>
          </div>
        </div>

        {/* Dynamic States */}
        {!hasSearched ? (
          <div className="text-center py-40 bg-white rounded-[3.5rem] border-2 border-dashed border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/[0.02] transition-colors"></div>
            <div className="relative z-10">
              <div className="w-28 h-28 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Search size={56} />
              </div>
              <h4 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">System Idle.</h4>
              <p className="text-slate-500 max-sm:px-6 max-w-sm mx-auto font-semibold leading-relaxed">
                Awaiting genomic or clinical query parameters. Enter a topic above to initiate multi-threaded synchronization.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-[3rem] p-20 text-center max-w-4xl mx-auto shadow-2xl shadow-red-100">
            <AlertCircle size={64} className="text-red-600 mx-auto mb-8" />
            <h4 className="text-3xl font-black text-red-900 mb-4 tracking-tight">Sync Interrupted</h4>
            <p className="text-red-700/70 mb-10 font-bold text-lg leading-relaxed">{error}</p>
            <button 
              onClick={() => searchPubMed()}
              className="px-12 py-5 bg-red-600 text-white text-xs font-black rounded-2xl hover:bg-red-700 transition-all shadow-2xl shadow-red-200 uppercase tracking-widest"
            >
              Retry Protocol
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-16">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Database size={24} className="text-blue-600" />
                </div>
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Syncing PubMed Database...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-40 bg-white rounded-[3.5rem] border border-slate-100 shadow-sm">
            <div className="w-28 h-28 bg-slate-50 text-slate-300 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10">
              <Filter size={56} />
            </div>
            <h4 className="text-3xl font-black text-slate-900 mb-4">No Records Found</h4>
            <p className="text-slate-400 max-w-sm mx-auto font-bold mb-10 uppercase tracking-widest text-xs">Adjust your search parameters or date range for better results.</p>
            <button onClick={onClearFilters} className="text-blue-600 text-sm font-black uppercase tracking-widest hover:underline">Reset Search Filters</button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            {articles.map((article, idx) => (
              <ArticleCard key={article.pmid || idx} article={article} />
            ))}
          </motion.div>
        )}
      </main>

      {/* AI Assistant Elements */}
      <AnimatePresence>
        {aiPromptVisible && (
          <motion.div 
            initial={{ y: 100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.8 }}
            className="fixed bottom-10 right-10 z-[100] w-[340px]"
          >
            <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] border border-blue-50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Bot size={80} />
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
                  <Bot size={28} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Intelligence Suite</div>
                  <div className="text-sm font-black text-slate-900 uppercase tracking-widest">Assistant Active</div>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-600 leading-relaxed mb-8">
                The analysis is complete! Would you like a condensed executive summary of the top 5 findings?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={onSummarize}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3 group/btn"
                >
                  <Sparkles size={16} className="group-hover/btn:scale-125 transition-transform" />
                  Yes, Summarize
                </button>
                <button 
                  onClick={() => setAiPromptVisible(false)}
                  className="w-full py-3 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {aiChatOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              width: aiWidgetMode === 'maximized' ? 'min(1200px, 90vw)' : aiWidgetMode === 'minimized' ? '300px' : '450px',
              height: aiWidgetMode === 'minimized' ? '70px' : 'auto'
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-10 right-10 z-[101] bg-white shadow-[0_48px_96px_-16px_rgba(0,0,0,0.25)] border border-slate-100 overflow-hidden flex flex-col ${
              aiWidgetMode === 'maximized' ? 'rounded-[3rem]' : 'rounded-[2.5rem]'
            }`}
            style={{ maxHeight: aiWidgetMode === 'maximized' ? '80vh' : aiWidgetMode === 'minimized' ? '70px' : '700px' }}
          >
            {/* Chat Header */}
            <div className={`p-6 bg-slate-900 text-white flex items-center justify-between transition-all ${aiWidgetMode === 'minimized' ? 'h-full' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/20 shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-0.5">Live Synthesis</div>
                  <div className="text-sm font-black tracking-tight">{aiWidgetMode === 'minimized' ? 'Report Ready' : 'AI Executive Report'}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {aiWidgetMode !== 'minimized' && (
                  <>
                    <button 
                      onClick={() => setAiWidgetMode(aiWidgetMode === 'maximized' ? 'normal' : 'maximized')}
                      className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                      title={aiWidgetMode === 'maximized' ? 'Restore' : 'Maximize'}
                    >
                      {aiWidgetMode === 'maximized' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <button 
                      onClick={() => setAiWidgetMode('minimized')}
                      className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                      title="Minimize"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </>
                )}
                {aiWidgetMode === 'minimized' && (
                  <button 
                    onClick={() => setAiWidgetMode('normal')}
                    className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <ChevronUp size={18} />
                  </button>
                )}
                <button 
                  onClick={() => { setAiChatOpen(false); setAiWidgetMode('normal'); }}
                  className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-red-500/80 transition-colors"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {aiWidgetMode !== 'minimized' && (
              <>
                {/* Chat Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide bg-slate-50/50">
                  {aiThinking && chatHistory.length === 0 ? (
                    <div className="py-20 text-center">
                      <div className="text-lg font-black text-slate-900 mb-4">{aiStep}</div>
                      <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden mx-auto shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${aiProgress}%` }}
                          className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                        />
                      </div>
                      <div className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">
                        Processing Scientific Papers...
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Initial Summary Bubble */}
                      {aiSummary && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-white rounded-[2rem] rounded-tl-none border border-slate-100 shadow-sm"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Bot size={14} className="text-blue-600" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Synthesis</span>
                          </div>
                          <div className="font-serif text-slate-700 leading-relaxed text-sm" style={{ fontFamily: "'Merriweather', serif" }}>
                            {formatMarkdown(aiSummary)}
                          </div>
                        </motion.div>
                      )}

                      {/* Conversational History */}
                      {chatHistory.map((msg, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] p-5 rounded-[1.8rem] text-sm font-medium leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-100' 
                              : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
                          }`}>
                            {msg.content}
                          </div>
                        </motion.div>
                      ))}

                      {/* Thinking Indicator */}
                      {aiThinking && chatHistory.length > 0 && (
                        <div className="flex justify-start">
                          <div className="p-4 bg-white border border-slate-100 rounded-[1.5rem] rounded-tl-none flex gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Chat Input & Actions */}
                <div className="p-6 bg-white border-t border-slate-100 space-y-4">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => navigate('/ai-report', { state: { summary: aiSummary, keyword: lastSearched, sourceCount: 5 } })}
                      className="px-4 py-3 bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors rounded-xl border border-slate-100"
                      title="View Report"
                    >
                      <FileText size={18} />
                    </button>
                    <form onSubmit={handleSendMessage} className="flex-1 relative group">
                      <input 
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask about this research..."
                        className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-600 focus:bg-white transition-all outline-none"
                      />
                      <button 
                        type="submit"
                        disabled={!chatInput.trim() || aiThinking}
                        className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-200 transition-all shadow-lg shadow-blue-200 flex items-center justify-center"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles size={10} className="text-blue-400" />
                      Llama 3.1 Research Engine
                    </p>
                    <button 
                      onClick={() => { setAiChatOpen(false); setAiWidgetMode('normal'); }}
                      className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                    >
                      Dismiss Session
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Footer */}
      <footer className="py-24 bg-slate-950 text-slate-500 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-16 mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                  <Dna size={24} />
                </div>
                <h4 className="text-2xl font-black text-white tracking-tight">NCBI <span className="text-blue-600">PRO</span></h4>
              </div>
              <p className="max-w-sm text-slate-400 font-medium leading-relaxed mb-10">
                The ultimate bioinformatics research portal for medical professionals. Real-time data sync, advanced filtering, and AI-driven synthesis.
              </p>
              <div className="flex items-center gap-6">
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center hover:bg-blue-600 transition-all"><Share2 size={18} /></a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center hover:bg-blue-600 transition-all"><Newspaper size={18} /></a>
              </div>
            </div>
            <div>
              <h5 className="text-white font-black mb-8 uppercase tracking-widest text-xs">Engineering</h5>
              <ul className="space-y-4 text-sm font-bold">
                <li><a href="#" className="hover:text-blue-500 transition-colors">API Endpoint</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Meta-Data Schema</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Tailscale Tunnel</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-slate-900 text-[10px] font-black uppercase tracking-[0.3em] text-center md:text-left">
            <p>© 2026 NCBI Global Research Hub. Powered by Advanced Agentic Coding.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/**
 * Article Card Component
 */
const ArticleCard = ({ article }) => {
  const navigate = useNavigate()
  
  const title = article?.title || 'No Title Available'
  const pmid = article?.pmid || 'N/A'
  const abstract = article?.abstract || 'No abstract text available for this study.'
  const journal = article?.journal || 'Unknown Journal'
  const date = article?.date || 'Undated'
  const authors = article?.authors || 'Authors not listed'

  const handleOpenDetail = () => {
    navigate(`/paper/${pmid}`, { state: { article } })
  }

  return (
    <motion.div 
      layout
      className="group bg-white hover:bg-slate-50/50 rounded-[2.5rem] border border-slate-200/60 hover:border-blue-300 shadow-sm hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 overflow-hidden flex flex-col cursor-pointer"
      onClick={handleOpenDetail}
    >
      <div className="p-8 flex-1">
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest">
            <BookOpen size={14} />
            {journal}
          </span>
        </div>

        <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight mb-4 line-clamp-2">
          {title}
        </h3>

        <div className="flex flex-wrap items-center gap-5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-300" />
            {date}
          </div>
          <div className="flex items-center gap-2 max-w-[150px]">
            <Users size={14} className="text-slate-300 shrink-0" />
            <span className="truncate">{authors}</span>
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden text-slate-600 text-sm leading-relaxed line-clamp-3 font-medium">
            {abstract}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white group-hover:from-slate-50/50 to-transparent"></div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-widest group-hover:gap-3 transition-all">
          Explore Detail <ArrowUpRight size={14} />
        </div>
      </div>

      <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em]">
          <Database size={12} />
          PMID: {pmid}
        </span>
        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
          <ChevronUp size={14} className="rotate-90" />
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Detailed Paper Reading Mode
 */
const PaperDetail = () => {
  const { pmid } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const article = location.state?.article
  const [copied, setCopied] = useState(false)

  const handleCopyCitation = () => {
    if (!article) return
    const citation = `${article.title}. ${article.authors}. ${article.journal}.`
    navigator.clipboard.writeText(citation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!article) {
      // Logic to fetch by pmid if state is missing could go here
      // For now, if no state, go back
      navigate('/')
    }
  }, [article, navigate])

  if (!article) return null

  return (
    <div className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-700">
      {/* Detail Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Results
          </button>
          <div className="flex items-center gap-4">
            <a 
              href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-200"
            >
              View on NCBI
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-32 max-w-5xl mx-auto px-6">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100">
                  Clinical Abstract
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
                {article.title}
              </h2>
            </div>

            {/* Abstract with Serif Typography */}
            <article className="prose prose-slate max-w-none">
              <div className="font-serif text-lg md:text-xl text-slate-800 leading-relaxed antialiased font-light" style={{ fontFamily: "'Merriweather', serif" }}>
                {formatAbstract(article.abstract)}
              </div>
            </article>

            {/* DOI Link Section */}
            {article.doi && (
              <div className="mt-16 p-8 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Digital Object Identifier</h4>
                  <p className="text-sm font-bold text-slate-900">{article.doi}</p>
                </div>
                <a 
                  href={`https://doi.org/${article.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-white hover:bg-blue-600 text-slate-400 hover:text-white rounded-2xl border border-slate-200 transition-all shadow-sm group"
                >
                  <ArrowUpRight size={24} className="group-hover:scale-110 transition-transform" />
                </a>
              </div>
            )}
          </div>

          {/* Sidebar Metadata */}
          <aside className="lg:col-span-1">
            <div className="sticky top-32 space-y-10">
              <button 
                onClick={handleCopyCitation}
                className={`w-full py-4 rounded-2xl border-2 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                  copied 
                    ? 'bg-green-50 border-green-200 text-green-600 shadow-lg shadow-green-100' 
                    : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:text-blue-600 hover:shadow-xl hover:shadow-blue-500/5'
                }`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Citation Copied!' : 'Copy Citation'}
              </button>

              <div className="space-y-6">
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BookOpen size={14} className="text-blue-500" /> Journal
                  </h5>
                  <p className="text-sm font-bold text-slate-900 leading-snug">{article.journal}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" /> Publication Date
                  </h5>
                  <p className="text-sm font-bold text-slate-900">{article.date}</p>
                </div>
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Users size={14} className="text-blue-500" /> Authors
                  </h5>
                  <div className="text-xs font-bold text-slate-600 leading-relaxed space-y-1">
                    {article.authors}
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t border-slate-100">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">PMID</span>
                    <span className="text-xs font-bold text-slate-900">{article.pmid}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Format</span>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <FileText size={12} /> PDF/HTML
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Detail Footer */}
      <footer className="py-12 border-t border-slate-100 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          NCBI Hub Scientific Publishing System
        </p>
      </footer>
    </div>
  )
}

function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastSearched, setLastSearched] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  
  // Pro Feature: Result Limit
  const [resultLimit, setResultLimit] = useState(20)
  
  // Advanced Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('relevance')
  
  // New State for Global Latest Research
  const [globalLatestPaper, setGlobalLatestPaper] = useState(null)
  const [globalLatestLoading, setGlobalLatestLoading] = useState(true)

  // AI Assistant States
  const [aiPromptVisible, setAiPromptVisible] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [aiStep, setAiStep] = useState('') // Psychological UI Trick
  const [aiProgress, setAiProgress] = useState(0)
  const [aiWidgetMode, setAiWidgetMode] = useState('normal') // 'normal', 'minimized', 'maximized'

  // New Chat States
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory])

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    if (!chatInput.trim() || aiThinking) return

    const userMsg = chatInput.trim()
    setChatInput('')
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
    setAiThinking(true)

    try {
      const response = await fetch(`${BASE_URL}/chat-with-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userMsg,
          articles: articles.length > 0 ? articles : (globalLatestPaper ? [globalLatestPaper] : [])
        })
      })

      if (response.ok) {
        const data = await response.json()
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.output }])
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the research database.' }])
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Network error. Please check your connection.' }])
    } finally {
      setAiThinking(false)
    }
  }

  const handleSummarize = async () => {
    if (articles.length === 0) return
    
    setAiPromptVisible(false)
    setAiChatOpen(true)
    setAiThinking(true)
    setAiSummary('')
    
    // Psychological Progress Steps
    const steps = [
      { msg: 'Reading Abstracts...', p: 20 },
      { msg: 'Identifying Trends...', p: 50 },
      { msg: 'Drafting Summary...', p: 85 },
      { msg: 'Finalizing Report...', p: 100 }
    ]

    for (const step of steps) {
      setAiStep(step.msg)
      setAiProgress(step.p)
      await new Promise(r => setTimeout(r, 800)) // Artificial delay for effect
    }

    try {
      const top5 = articles.slice(0, 5).map(a => ({ title: a.title, abstract: a.abstract }))
      const response = await fetch(`${BASE_URL}/summarize-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: top5 })
      })
      
      if (response.ok) {
        const data = await response.json()
        setAiSummary(data.output || data.summary || data.text || 'Analysis complete. Key findings are ready.')
      } else {
        setAiSummary('Failed to connect to AI engine. Please try again.')
      }
    } catch (err) {
      setAiSummary('Network error. AI synchronization failed.')
    } finally {
      setAiThinking(false)
    }
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setSortBy('relevance')
    setResultLimit(20)
  }

  // Fetch Global Latest Research
  const fetchGlobalLatest = async () => {
    setGlobalLatestLoading(true)
    try {
      const response = await fetch(`${BASE_URL}/get-latest-research`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store'
      })
      if (response.ok) {
        const data = await response.json()
        console.log("Global Latest Raw Data:", data)
        
        // Simple Mapping: FastAPI returns exactly what's needed
        if (data && data.latest) {
          setGlobalLatestPaper(data.latest)
        }
      }
    } catch (err) {
      console.error("Latest research fetch failed:", err)
      console.error("Full Error Details:", err)
    } finally {
      setGlobalLatestLoading(false)
    }
  }

  // Fetch on mount
  useEffect(() => {
    fetchGlobalLatest()
  }, [])

  const searchPubMed = async (e) => {
    if (e) e.preventDefault()
    if (!searchTerm.trim()) return

    setLoading(true)
    setError(null)
    setHasSearched(true)
    setLastSearched(searchTerm)

    try {
      // Dynamic URL with resultLimit and Advanced Filters
      const fetchUrl = `${BASE_URL}/search?keyword=${encodeURIComponent(searchTerm)}&limit=${resultLimit}&start_date=${startDate}&end_date=${endDate}&sort_by=${sortBy}`
      
      const response = await fetch(fetchUrl, { method: 'GET', mode: 'cors' })
      if (!response.ok) throw new Error(`Server status ${response.status}`)
      
      const data = await response.json()
      const results = data.articles || []
      setArticles(results)
      
      // Trigger AI Prompt after success
      if (results.length > 0) {
        setTimeout(() => setAiPromptVisible(true), 1500)
      }
    } catch (err) {
      setError(err.message.includes('Failed to fetch') ? 'Network error. Check if FastAPI backend is running.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <Home 
              articles={articles} 
              loading={loading} 
              error={error} 
              searchTerm={searchTerm} 
              setSearchTerm={setSearchTerm} 
              searchPubMed={searchPubMed}
              hasSearched={hasSearched}
              lastSearched={lastSearched}
              globalLatestPaper={globalLatestPaper}
              globalLatestLoading={globalLatestLoading}
              onRefreshLatest={fetchGlobalLatest}
              resultLimit={resultLimit}
              setResultLimit={setResultLimit}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onClearFilters={clearFilters}
              aiPromptVisible={aiPromptVisible}
              setAiPromptVisible={setAiPromptVisible}
              aiChatOpen={aiChatOpen}
              setAiChatOpen={setAiChatOpen}
              aiThinking={aiThinking}
              aiSummary={aiSummary}
              aiStep={aiStep}
              aiProgress={aiProgress}
              onSummarize={handleSummarize}
              aiWidgetMode={aiWidgetMode}
              setAiWidgetMode={setAiWidgetMode}
              chatHistory={chatHistory}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleSendMessage={handleSendMessage}
              chatEndRef={chatEndRef}
            />
          } 
        />
        <Route path="/paper/:pmid" element={<PaperDetail />} />
        <Route path="/ai-report" element={<AIReport />} />
      </Routes>
    </BrowserRouter>
  )
}

/**
 * Dedicated AI Report Page
 */
const AIReport = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { summary, keyword, sourceCount } = location.state || {}

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!summary) navigate('/')
  }, [summary, navigate])

  if (!summary) return null

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-100 selection:text-blue-700">
      {/* Report Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-black text-slate-600 hover:text-blue-600 transition-colors uppercase tracking-widest group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Search
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest"
            >
              <Printer size={14} />
              Print
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase tracking-widest"
            >
              <Download size={14} />
              Export PDF
            </button>
          </div>
        </div>
      </nav>

      {/* Print Specific Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 2cm; }
          body { background: white !important; }
          .min-h-screen { background: white !important; padding: 0 !important; }
          main { padding-top: 0 !important; padding-bottom: 0 !important; max-width: 100% !important; }
          .lg\\:grid-cols-4 { display: block !important; }
          .shadow-2xl { shadow: none !important; box-shadow: none !important; }
          .rounded-\\[3rem\\] { border-radius: 0 !important; }
          .p-12, .md\\:p-20 { padding: 0 !important; }
          .border { border: none !important; }
          .font-serif { font-size: 12pt !important; line-height: 1.6 !important; color: black !important; }
          h1 { font-size: 24pt !important; margin-bottom: 1cm !important; }
          .mt-20 { margin-top: 1cm !important; }
        }
      `}} />

      <main className="pt-32 pb-32 max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Sidebar Metadata */}
          <aside className="lg:col-span-1 order-2 lg:order-1 print:hidden">
            <div className="sticky top-32 space-y-8">
              <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Analysis Metadata</h4>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Original Query</span>
                    <p className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">"{keyword}"</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Analysis Scope</span>
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText size={14} className="text-blue-500" />
                      {sourceCount} Analyzed Papers
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Confidence Score</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-[94%]"></div>
                      </div>
                      <span className="text-[10px] font-black text-green-600">94%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white print:hidden">
                <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Research Note</h5>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  This report is synthesized using advanced LLM technology. Please cross-reference with PMIDs for clinical decisions.
                </p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="bg-white rounded-[3rem] p-12 md:p-20 border border-slate-100 shadow-2xl shadow-slate-200/50">
              <div className="mb-12 border-b border-slate-100 pb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest mb-6">
                  Executive Intelligence Report
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-4">
                  Scientific Synthesis: {keyword}
                </h1>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.3em]">
                  Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <article className="prose prose-slate max-w-none">
                <div className="font-serif text-xl md:text-2xl text-slate-800 leading-relaxed antialiased font-light" style={{ fontFamily: "'Merriweather', serif" }}>
                  {formatMarkdown(summary)}
                </div>
              </article>

              <div className="mt-20 pt-12 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                    <Database size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Source</p>
                    <p className="text-xs font-bold text-slate-900">National Library of Medicine (NCBI)</p>
                  </div>
                </div>
                <div className="w-32 h-10 opacity-20 grayscale">
                  <div className="flex items-center gap-1 font-black text-2xl tracking-tighter text-slate-900">
                    <Dna size={24} className="text-blue-600" />
                    NCBI<span className="text-blue-600">PRO</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App


