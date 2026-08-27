import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Users, BookOpen, MapPin, Sparkles, Plus, Search, 
  ThumbsUp, ShieldCheck, CheckCircle2, AlertCircle, HelpCircle, User, 
  Send, EyeOff, Filter, ArrowRight, X
} from 'lucide-react';
import { api } from '../services/api';
import { QuestionDetailModal } from './QuestionDetailModal';
import { HostelExperienceModal } from './HostelExperienceModal';
import { RoommateMatchingHub } from './RoommateMatchingHub';
import { LocalGuideViewer } from './LocalGuideViewer';
import { AreaGuideDetail } from './AreaGuideDetail';

interface CommunityHubProps {
  isAuthenticated: boolean;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenAuthModal?: () => void;
  initialTab?: 'questions' | 'experiences' | 'roommates' | 'guides' | 'areas';
}

const defaultQuestions = [
  {
    id: 'q-lautech-1',
    title: 'Which hostels around Under G have the most reliable solar inverter and borehole water?',
    description: 'Looking for a clean self-contain lodge in Under G with steady solar inverter or generator schedule and continuous running water. Budget is around ₦250k - ₦300k.',
    category: 'AREAS',
    authorName: 'Oluwaseun Adeyemi',
    isVerifiedStudent: true,
    answersCount: 2,
    isAnswered: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-lautech-2',
    title: 'How is the electricity situation in Adenike area during examination weeks?',
    description: 'I want to rent a room in Adenike near Destiny Supermarket. How many hours of electricity do they get on average per day?',
    category: 'FACILITIES',
    authorName: 'Blessing Okafor',
    isVerifiedStudent: true,
    answersCount: 3,
    isAnswered: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'q-lautech-3',
    title: 'What should I check before paying caution deposit on Stadium Road lodges?',
    description: 'Are caution deposits easily refundable upon vacating hostels along Stadium Road? What documents or agreement should I demand from the caretaker?',
    category: 'COSTS',
    authorName: 'Farouk Ibrahim',
    isVerifiedStudent: true,
    answersCount: 1,
    isAnswered: true,
    createdAt: new Date().toISOString()
  }
];

const defaultExperiences = [
  {
    id: 'exp-1',
    propertyTitle: 'Harmony Heights Lodge, Under G',
    authorName: 'Ayomide Balogun (400L Computer Science)',
    academicSession: '2025/2026',
    isVerifiedStay: true,
    overallExperience: 'Very peaceful compound with 24/7 security. Borehole water is pumped every morning and evening. Solar inverter powers light points and fan sockets throughout the night.',
    positivesSummary: 'Constant solar power for laptops, clean tiled rooms, perimeter fence',
    concernsSummary: 'Network can fluctuate slightly during heavy rain'
  },
  {
    id: 'exp-2',
    propertyTitle: 'Royal Villa, Stadium Road',
    authorName: 'Khadijat Bello (300L Nursing)',
    academicSession: '2025/2026',
    isVerifiedStay: true,
    overallExperience: 'Great environment for studying. No loud parties allowed after 10 PM. 10 minutes bike ride to LAUTECH Teaching Hospital Gate.',
    positivesSummary: 'Extremely quiet, security guards on duty, prepaid meter per room',
    concernsSummary: 'Slightly higher transport fare during evening rush hour'
  }
];

export const CommunityHub: React.FC<CommunityHubProps> = ({
  isAuthenticated,
  onShowToast,
  onOpenAuthModal,
  initialTab = 'questions'
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'experiences' | 'roommates' | 'guides' | 'areas'>(initialTab);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [questions, setQuestions] = useState<any[]>(defaultQuestions);
  const [experiences, setExperiences] = useState<any[]>(defaultExperiences);
  const [loading, setLoading] = useState(false);

  // Ask Question Modal State
  const [showAskModal, setShowAskModal] = useState(false);
  const [askTitle, setAskTitle] = useState('');
  const [askDescription, setAskDescription] = useState('');
  const [askCategory, setAskCategory] = useState('AREAS');
  const [askAnonymous, setAskAnonymous] = useState(false);
  const [submittingAsk, setSubmittingAsk] = useState(false);

  // Selected Question Modal
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const fetchQuestionsAndExperiences = async () => {
    try {
      if (activeTab === 'questions') {
        const res = await api.community.getQuestions({
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          search: searchQuery.trim() || undefined
        });
        if (res.questions && res.questions.length > 0) {
          setQuestions(res.questions);
        }
      } else if (activeTab === 'experiences') {
        const res = await api.community.getExperiences();
        if (res.experiences && res.experiences.length > 0) {
          setExperiences(res.experiences);
        }
      }
    } catch (err) {
      console.error('Failed to load community content:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'questions' || activeTab === 'experiences') {
      fetchQuestionsAndExperiences();
    }
  }, [activeTab, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestionsAndExperiences();
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    if (!askTitle.trim() || askTitle.trim().length < 8) {
      onShowToast('Question title must be at least 8 characters long', 'error');
      return;
    }
    if (!askDescription.trim() || askDescription.trim().length < 15) {
      onShowToast('Please provide more details in description (at least 15 characters)', 'error');
      return;
    }

    setSubmittingAsk(true);
    try {
      const res = await api.community.askQuestion({
        title: askTitle.trim(),
        description: askDescription.trim(),
        category: askCategory,
        isAnonymous: askAnonymous
      });

      onShowToast('Your question has been posted to the student community', 'success');
      setShowAskModal(false);
      setAskTitle('');
      setAskDescription('');
      fetchQuestionsAndExperiences();
      if (res.question?.id) {
        setSelectedQuestionId(res.question.id);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to post question', 'error');
    } finally {
      setSubmittingAsk(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Community Hero Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Hostel Ease Student Community (LAUTECH)
            </span>
            <span className="text-xs text-slate-400 font-medium">Non-Addictive • Decision-Focused</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Learn from Real Students. Avoid Costly Mistakes.
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            Get factual answers on LAUTECH lodge conditions, compare verified experiences across Ogbomoso neighborhoods, and discover compatible roommates.
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-4 sm:mt-0 relative z-10 flex items-center gap-3">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                if (onOpenAuthModal) onOpenAuthModal();
                return;
              }
              setShowAskModal(true);
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>Ask Accommodation Question</span>
          </button>
        </div>
      </div>

      {/* Primary Section Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'questions', label: 'Questions & Answers', icon: MessageSquare, badge: null },
          { id: 'experiences', label: 'Hostel Experiences', icon: Sparkles, badge: null },
          { id: 'roommates', label: 'Roommate Matching', icon: Users, badge: 'Optional' },
          { id: 'guides', label: 'Accommodation Guides', icon: BookOpen, badge: 'Verified' },
          { id: 'areas', label: 'LAUTECH Area Guides', icon: MapPin, badge: null }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 flex-shrink-0 shadow-sm ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                  isActive ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: QUESTIONS & ANSWERS */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          
          {/* Filter Bar & Search */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 flex-shrink-0 mr-1">
                <Filter className="w-3 h-3" />
                Category:
              </span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'AREAS', label: 'Areas & Commute' },
                { id: 'INSPECTIONS', label: 'Inspections' },
                { id: 'SCAMS_SAFETY', label: 'Scam Defense' },
                { id: 'FACILITIES', label: 'Light & Water' },
                { id: 'COSTS', label: 'Rent & Fees' }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex-shrink-0 ${
                    categoryFilter === c.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </form>
          </div>

          {/* Questions Feed */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading student questions...</div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-black text-slate-800">No questions found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Have a question about a hostel or area around LAUTECH? Ask the community!
              </p>
              <button
                onClick={() => setShowAskModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl"
              >
                Ask Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestionId(q.id)}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {q.category}
                      </span>
                      {q.isAnswered ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {q.answersCount} Answers
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          Awaiting Answers
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-black text-slate-900 leading-snug hover:text-emerald-700 transition-colors line-clamp-2">
                      {q.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                      {q.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{q.authorName}</span>
                      {q.isVerifiedStudent && (
                        <span className="text-[9px] font-black px-1 rounded bg-blue-100 text-blue-800">
                          VERIFIED
                        </span>
                      )}
                    </div>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <span>View Thread</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* SECTION 2: HOSTEL EXPERIENCES */}
      {activeTab === 'experiences' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
            <div>
              <h3 className="font-black text-slate-900">Student Hostel Observations & Stays</h3>
              <p className="text-slate-500">Real feedback on electricity schedules, borehole water, and safety</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-black rounded-full border border-emerald-300 text-[11px]">
              {experiences.length} Experiences Shared
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {experiences.map((exp) => (
              <div key={exp.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{exp.propertyTitle}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">
                      {exp.authorName} • {exp.academicSession}
                    </p>
                  </div>
                  {exp.isVerifiedStay && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                      VERIFIED STAY
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  "{exp.overallExperience}"
                </p>

                {/* Positives & Concerns */}
                <div className="space-y-1 text-[11px] pt-2 border-t border-slate-100">
                  {exp.positivesSummary && (
                    <p className="text-emerald-800 font-bold flex items-center gap-1">
                      ✓ {exp.positivesSummary}
                    </p>
                  )}
                  {exp.concernsSummary && (
                    <p className="text-amber-800 font-medium flex items-center gap-1">
                      ⚠ {exp.concernsSummary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: ROOMMATE MATCHING */}
      {activeTab === 'roommates' && (
        <RoommateMatchingHub
          isAuthenticated={isAuthenticated}
          onShowToast={onShowToast}
          onOpenAuthModal={onOpenAuthModal}
        />
      )}

      {/* SECTION 4: ACCOMMODATION GUIDES */}
      {activeTab === 'guides' && (
        <LocalGuideViewer onShowToast={onShowToast} />
      )}

      {/* SECTION 5: LAUTECH AREA GUIDES */}
      {activeTab === 'areas' && (
        <AreaGuideDetail />
      )}

      {/* ASK QUESTION MODAL */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span>Ask Accommodation Question</span>
              </h3>
              <button onClick={() => setShowAskModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Question Title *</label>
                <input
                  type="text"
                  value={askTitle}
                  onChange={(e) => setAskTitle(e.target.value)}
                  placeholder="e.g. Which hostels around Adenike have constant solar electricity?"
                  required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Category</label>
                <select
                  value={askCategory}
                  onChange={(e) => setAskCategory(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="AREAS">Areas & Distance to Campus</option>
                  <option value="INSPECTIONS">Inspections & What to Check</option>
                  <option value="SCAMS_SAFETY">Scam Prevention & Safety</option>
                  <option value="FACILITIES">Electricity, Water & Internet</option>
                  <option value="COSTS">Rent, Caution & Pricing</option>
                  <option value="GENERAL">General Accommodation</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Detailed Description *</label>
                <textarea
                  value={askDescription}
                  onChange={(e) => setAskDescription(e.target.value)}
                  placeholder="Provide context on your budget, room type, or specific compound you're inquiring about..."
                  rows={3}
                  required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={askAnonymous}
                  onChange={(e) => setAskAnonymous(e.target.checked)}
                  className="accent-emerald-600 rounded"
                />
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  Post Anonymously to other students
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAsk}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow flex items-center gap-1.5"
                >
                  {submittingAsk ? 'Publishing...' : 'Post Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUESTION DETAIL MODAL */}
      {selectedQuestionId && (
        <QuestionDetailModal
          questionId={selectedQuestionId}
          isOpen={Boolean(selectedQuestionId)}
          onClose={() => setSelectedQuestionId(null)}
          isAuthenticated={isAuthenticated}
          onShowToast={onShowToast}
          onOpenAuthModal={onOpenAuthModal}
        />
      )}

    </div>
  );
};
