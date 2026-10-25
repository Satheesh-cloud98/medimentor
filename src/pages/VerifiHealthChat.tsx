import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  User,
  Brain,
  MessageSquare,
  ChevronLeft,
  Menu,
  FileText,
} from 'lucide-react';
import { useReports } from '../context/ReportsContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getUserChats,
  createChatThread,
  deleteChatThread,
  renameChatThread,
  updateThreadMessages,
  getUserMemory,
  addMemoryItem,
  removeMemoryItem,
  clearUserMemory,
  syncUserChatsWithServer,
} from '../services/chatStorageService';
import { sendChatMessage } from '../services/chatService';
import type { ChatThread, ChatMessage, UserMemoryItem } from '../types/chat';

export const VerifiHealthChat: React.FC = () => {
  const { profile, reports } = useReports();
  const { language } = useLanguage();

  // Active threads state for current user
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastModelName, setLastModelName] = useState<string>('Live Gemini Cloud');
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);

  // Rename thread state
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState<string>('');

  // Mobile sidebar toggle
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // Memory Drawer state
  const [memoryModalOpen, setMemoryModalOpen] = useState<boolean>(false);
  const [memoryItems, setMemoryItems] = useState<UserMemoryItem[]>([]);
  const [newMemoryKey, setNewMemoryKey] = useState<string>('');
  const [newMemoryVal, setNewMemoryVal] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load threads whenever active profile changes (Strict User Isolation + Cloud Sync)
  useEffect(() => {
    const userThreads = getUserChats(profile.id);
    setThreads(userThreads);

    if (userThreads.length > 0) {
      setActiveThreadId(userThreads[0].id);
      setMessages(userThreads[0].messages || []);
    } else {
      // Start with a clean fresh thread
      const fresh = createChatThread(profile.id, 'New Conversation');
      setThreads([fresh]);
      setActiveThreadId(fresh.id);
      setMessages([]);
    }

    // Synchronize with server database (enforces cloud recovery after refresh/browser clear)
    syncUserChatsWithServer(profile.id).then((serverThreads) => {
      if (serverThreads && serverThreads.length > 0) {
        setThreads(serverThreads);
        const hasLocalMessages = userThreads.some((t) => t.messages && t.messages.length > 0);
        if (!hasLocalMessages && serverThreads[0].messages?.length > 0) {
          setActiveThreadId(serverThreads[0].id);
          setMessages(serverThreads[0].messages || []);
        }
      }
    });

    // Load memory for active profile
    setMemoryItems(getUserMemory(profile.id));
  }, [profile.id]);

  // Sync messages when active thread changes
  const activeThread = threads.find((t) => t.id === activeThreadId);

  useEffect(() => {
    if (activeThread) {
      setMessages(activeThread.messages || []);
    }
  }, [activeThreadId]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Create New Chat
  const handleNewChat = () => {
    const fresh = createChatThread(profile.id, 'New Conversation');
    setThreads((prev) => [fresh, ...prev]);
    setActiveThreadId(fresh.id);
    setMessages([]);
    setMobileDrawerOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Delete Chat with confirmation
  const handleDeleteChat = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation history permanently?')) {
      const updated = deleteChatThread(profile.id, threadId);
      setThreads(updated);
      if (activeThreadId === threadId) {
        if (updated.length > 0) {
          setActiveThreadId(updated[0].id);
          setMessages(updated[0].messages || []);
        } else {
          handleNewChat();
        }
      }
    }
  };

  // Start Rename
  const handleStartRename = (thread: ChatThread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setRenameTitle(thread.title);
  };

  // Save Rename
  const handleSaveRename = (threadId: string) => {
    if (renameTitle.trim()) {
      const updated = renameThread(profile.id, threadId, renameTitle.trim());
      setThreads(updated);
    }
    setEditingThreadId(null);
  };

  // Helper for renaming
  const renameThread = (userId: string, threadId: string, title: string) => {
    return renameChatThread(userId, threadId, title);
  };

  // Send message
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputValue).trim();
    if (!promptToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    // Save to storage immediately
    const autoTitle = messages.length === 0 ? promptToSend.slice(0, 32) : undefined;
    const currentThreadId = activeThreadId || threads[0]?.id;
    updateThreadMessages(profile.id, currentThreadId, updatedMessages, autoTitle);

    // Prepare API turns
    const apiTurns = updatedMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    try {
      const response = await sendChatMessage(apiTurns, profile, reports, language);
      setLastModelName(response.modelName);
      setIsRateLimited(Boolean(response.isRateLimitFallback));

      const assistantMsg: ChatMessage = {
        id: `msg-resp-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelName: response.modelName,
        isFallback: response.isFallback,
        isRateLimitFallback: response.isRateLimitFallback,
        fallbackReason: response.fallbackReason,
        citations: response.citations,
        urgentCareWarning: response.urgentCareWarning,
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      updateThreadMessages(profile.id, currentThreadId, finalMessages, autoTitle);

      // Refresh threads list in state
      setThreads(getUserChats(profile.id));
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Memory Management Handlers
  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryKey.trim() || !newMemoryVal.trim()) return;
    const updated = addMemoryItem(profile.id, newMemoryKey.trim(), newMemoryVal.trim());
    setMemoryItems(updated);
    setNewMemoryKey('');
    setNewMemoryVal('');
  };

  const handleRemoveMemory = (id: string) => {
    const updated = removeMemoryItem(profile.id, id);
    setMemoryItems(updated);
  };

  const handleClearAllMemory = () => {
    if (window.confirm('Clear all saved health preferences and memory for this profile?')) {
      clearUserMemory(profile.id);
      setMemoryItems([]);
    }
  };

  // Filter threads by search query
  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const quickChips = [
    '📊 What do my latest lipid & cholesterol results mean?',
    '🩸 Explain my HbA1c 6.1% and prediabetes baseline',
    '💊 Are any medications prescribed in my records?',
    '🩺 What discussion questions should I ask my doctor?',
    '📁 How do I export my health records as FHIR R4 JSON?',
    '🛡️ How does MediMentor prevent duplicate records?',
  ];

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6.5rem)] flex flex-col animate-fadeIn">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white rounded-2xl px-5 py-3 border border-slate-200/90 shadow-2xs mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                VerifiHealth AI Copilot
              </h1>
              {isRateLimited ? (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300"
                  title="Google Gemini rate-limit fallback active"
                >
                  <ShieldCheck className="w-3 h-3 text-amber-600" /> Grounded Fail-Safe Engine
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {lastModelName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Grounded exclusively in {reports.length} verified patient records • Zero hallucination
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cloud Auth & Sync Badge */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>JWT Auth & Cloud Sync Active</span>
          </span>

          {/* Active Patient Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
            <User className="w-3.5 h-3.5 text-teal-600" />
            <span>{profile.name}</span>
          </span>

          {/* Manage Memory Button */}
          <button
            type="button"
            onClick={() => setMemoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 text-slate-700 hover:text-teal-700 hover:bg-teal-50 text-xs font-bold transition-colors cursor-pointer"
            title="Manage saved personalization memory"
          >
            <Brain className="w-3.5 h-3.5 text-teal-600" />
            <span>Memory ({memoryItems.length})</span>
          </button>

          {/* Mobile recent chats toggle */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden cursor-pointer"
            title="Toggle recent chats"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Grid (Sidebar + Chat Area) */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden flex relative">
        {/* Left Drawer / Recent Chats Sidebar */}
        <aside
          className={`absolute lg:relative z-20 inset-y-0 left-0 w-72 bg-slate-50/80 border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
            mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* New Chat Header */}
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Search Chats Input */}
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Recent Chats List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Recent Conversations</span>
              <span>{filteredThreads.length}</span>
            </div>

            {filteredThreads.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 space-y-1">
                <MessageSquare className="w-6 h-6 mx-auto text-slate-300" />
                <p>No conversations found</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const isEditing = editingThreadId === thread.id;

                return (
                  <div
                    key={thread.id}
                    onClick={() => {
                      setActiveThreadId(thread.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`group relative p-2.5 rounded-xl cursor-pointer text-xs transition-all flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-teal-50 border border-teal-200/80 text-teal-900 font-semibold shadow-2xs'
                        : 'hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />

                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={renameTitle}
                            onChange={(e) => setRenameTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(thread.id);
                              if (e.key === 'Escape') setEditingThreadId(null);
                            }}
                            autoFocus
                            className="w-full px-2 py-0.5 text-xs bg-white border border-teal-500 rounded focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(thread.id)}
                            className="p-1 text-teal-700 hover:text-teal-900"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingThreadId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="truncate flex-1">{thread.title || 'Untitled Conversation'}</span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(thread, e)}
                          title="Rename Chat"
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteChat(thread.id, e)}
                          title="Delete Chat"
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer with Memory Count */}
          <div className="p-3 border-t border-slate-200 bg-white/70 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-teal-600" />
              <span>Personalized Memory</span>
            </span>
            <span className="font-bold text-slate-700">{memoryItems.length} active</span>
          </div>
        </aside>

        {/* Right Chat Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* Active Conversation Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              // Clean Welcome / Empty State
              <div className="max-w-xl mx-auto py-8 text-center space-y-5 animate-fadeIn">
                <div className="w-16 h-16 rounded-3xl bg-teal-100/70 text-teal-700 flex items-center justify-center mx-auto shadow-xs border border-teal-200">
                  <Sparkles className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Hello {profile.name}!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    I am **VerifiHealth**, your personal AI health copilot. I provide educational physiological insights strictly grounded in your verified medical records.
                  </p>
                </div>

                {/* Grounding Status Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>
                    Grounded in <strong>{reports.length} records</strong> ({reports.filter((r) => r.isVerified).length} verified)
                  </span>
                </div>

                {/* Quick Action Suggestion Chips */}
                <div className="pt-2 space-y-2 text-left max-w-lg mx-auto">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    Suggested Medical Inquiries
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(chip)}
                        className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-teal-50 hover:border-teal-300 text-xs text-slate-700 hover:text-teal-900 text-left font-medium transition-all cursor-pointer shadow-2xs"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Message Bubbles List
              messages.map((msg) => {
                const isUser = msg.role === 'user';

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className="space-y-1.5 max-w-[85%] sm:max-w-[78%]">
                      {/* Message Bubble Card */}
                      <div
                        className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                          isUser
                            ? 'bg-teal-600 text-white rounded-tr-none shadow-xs'
                            : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none shadow-2xs'
                        }`}
                      >
                        {/* Fallback Engine Notice */}
                        {!isUser && msg.isFallback && (
                          <div className="mb-2.5 p-2 rounded-xl bg-teal-50 border border-teal-200 text-[11px] text-teal-900 flex items-start gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-semibold">Grounded Clinical Engine Active (Fail-Safe Fallback):</strong>
                              <span>Response synthesized from verified patient records. {msg.fallbackReason || 'Google Gemini unavailable.'}</span>
                            </div>
                          </div>
                        )}

                        {msg.content}

                        {/* Urgent Care Alert Banner */}
                        {msg.urgentCareWarning && (
                          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block">Immediate Emergency Advisory:</strong>
                              <span>Call emergency services (112 / 108 / 911) or visit the nearest emergency room immediately.</span>
                            </div>
                          </div>
                        )}

                        {/* Grounded Citation Chips */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Grounded In Verified Records:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.citations.map((cite, cIdx) => (
                                <span
                                  key={cIdx}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                                    cite.isDemo
                                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                                      : 'bg-teal-50 text-teal-900 border-teal-200'
                                  }`}
                                >
                                  <FileText className={`w-3 h-3 ${cite.isDemo ? 'text-amber-600' : 'text-teal-600'}`} />
                                  <span>{cite.recordTitle}:</span>
                                  <strong>{cite.metricOrFinding}</strong>
                                  {cite.value && <span>({cite.value})</span>}
                                  {cite.isDemo && (
                                    <span className="text-[9px] font-bold text-amber-900 bg-amber-200/90 px-1.5 py-0.5 rounded border border-amber-300">
                                      ⚠️ SAMPLE DEMO RECORD
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Message Timestamp & Model Footer */}
                      <div className={`flex items-center gap-2 text-[10px] text-slate-400 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <span>{msg.timestamp}</span>
                        {!isUser && msg.modelName && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-slate-500">{msg.modelName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading typing indicator */}
            {isLoading && (
              <div className="flex items-center gap-3 text-xs text-slate-400 max-w-md animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-slate-500 font-medium ml-1">VerifiHealth is reviewing your records...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-end gap-2 bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs focus-within:border-teal-500 transition-colors">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask VerifiHealth about your lab tests, prescriptions, health trends..."
                className="flex-1 text-xs sm:text-sm text-slate-900 bg-transparent resize-none p-1.5 focus:outline-none max-h-32"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className={`p-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                  inputValue.trim() && !isLoading
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Medical Disclaimer */}
            <p className="text-[10px] text-slate-400 text-center leading-normal">
              Educational assistance strictly grounded in verified records. Not a substitute for professional clinical diagnosis or prescription.
            </p>
          </div>
        </div>
      </div>

      {/* Slide-Over Memory Management Modal */}
      {memoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">Personalized Memory</h3>
              </div>
              <button
                type="button"
                onClick={() => setMemoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              VerifiHealth saves only user-approved health context (allergies, dietary preferences, wellness goals) to personalize your conversations.
            </p>

            {/* Memory List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {memoryItems.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No memory items saved for {profile.name} yet.
                </div>
              ) : (
                memoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <strong className="text-slate-800">{item.key}:</strong>{' '}
                      <span className="text-slate-600">{item.value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMemory(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete memory item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Memory Form */}
            <form onSubmit={handleAddMemory} className="space-y-2 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  value={newMemoryKey}
                  onChange={(e) => setNewMemoryKey(e.target.value)}
                  placeholder="Key (e.g. Diet Goal)"
                  className="p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                />
                <input
                  type="text"
                  value={newMemoryVal}
                  onChange={(e) => setNewMemoryVal(e.target.value)}
                  placeholder="Value (e.g. Low sodium)"
                  className="p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                {memoryItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllMemory}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Clear All Memory
                  </button>
                )}
                <button
                  type="submit"
                  className="ml-auto px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Save Preference
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
