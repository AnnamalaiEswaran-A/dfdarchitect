
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GeminiService } from './services/geminiService';
import { DFDStructure, ChatMessage } from './types';
import DFDCanvas from './components/DFDCanvas';
import { 
  PlusIcon, 
  ArrowUpTrayIcon, 
  ChatBubbleLeftRightIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  CameraIcon,
  KeyIcon,
  PencilSquareIcon,
  CheckIcon,
  SquaresPlusIcon,
  LinkIcon,
  ArchiveBoxIcon,
  UserIcon
} from '@heroicons/react/24/outline';

// Fix: Use the globally defined AIStudio interface to avoid "Subsequent property declarations must have the same type" errors.
declare global {
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [dfd, setDfd] = useState<DFDStructure | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  
  // Visual Manual Edit Mode
  const [isManualEdit, setIsManualEdit] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gemini = useRef(new GeminiService());

  // Get all node options for flow selection
  const allNodes = useMemo(() => {
    if (!dfd) return [];
    return [
      ...dfd.externalEntities.map(e => ({ id: e.id, name: `[Entity] ${e.name}` })),
      ...dfd.processes.map(p => ({ id: p.id, name: `[Process ${p.number}] ${p.name}` })),
      ...dfd.dataStores.map(s => ({ id: s.id, name: `[Store] ${s.name}` }))
    ];
  }, [dfd]);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeyReady(hasKey);
        if (!hasKey) setShowKeyPrompt(true);
      } else {
        setShowKeyPrompt(true);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAnalyzing]);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setApiKeyReady(true);
      setShowKeyPrompt(false);
    }
  };

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string, extra?: Partial<ChatMessage>) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      ...extra
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleInitialUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!apiKeyReady) {
      setShowKeyPrompt(true);
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const previewUrl = URL.createObjectURL(file);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      addMessage('user', `Uploaded diagram: ${file.name}`, { image: previewUrl });
      try {
        const result = await gemini.current.analyzeInitialImage(base64);
        if (result.updated_dfd) {
          setDfd(result.updated_dfd);
          addMessage('assistant', result.message, { suggestedPrompts: result.suggested_prompts });
        }
      } catch (error: any) {
        if (error.message === "API_KEY_NOT_FOUND") {
          setApiKeyReady(false);
          setShowKeyPrompt(true);
          addMessage('system', "API key not found. Please select a valid key.");
        } else {
          addMessage('system', error.message || "Failed to analyze diagram.");
        }
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (text?: string) => {
    if (!apiKeyReady) {
      setShowKeyPrompt(true);
      return;
    }
    const query = text || userInput;
    const hasImage = !!pendingImage;
    if (!query.trim() && !hasImage) return;

    const currentImage = pendingImage;
    setUserInput('');
    setPendingImage(null);
    
    addMessage('user', query || "Analyzed attachment.", { image: currentImage || undefined });
    setIsAnalyzing(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      if (!dfd && currentImage) {
        const result = await gemini.current.analyzeInitialImage(currentImage);
        if (result.updated_dfd) setDfd(result.updated_dfd);
        addMessage('assistant', result.message, { suggestedPrompts: result.suggested_prompts });
      } else if (dfd) {
        const result = await gemini.current.refineDFD(query, dfd, history, currentImage || undefined);
        if (result.updated_dfd) setDfd(result.updated_dfd);
        addMessage('assistant', result.message, { suggestedPrompts: result.suggested_prompts });
      }
    } catch (error: any) {
      if (error.message === "API_KEY_NOT_FOUND") {
        setApiKeyReady(false);
        setShowKeyPrompt(true);
        addMessage('system', "Key error. Please re-select your API key.");
      } else {
        addMessage('system', "Processing error. Please retry.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- MANUAL EDITOR ACTIONS ---

  const updateElementPosition = (id: string, x: number, y: number) => {
    if (!dfd) return;
    setDfd(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        externalEntities: prev.externalEntities.map(e => e.id === id ? { ...e, x, y } : e),
        processes: prev.processes.map(p => p.id === id ? { ...p, x, y } : p),
        dataStores: prev.dataStores.map(s => s.id === id ? { ...s, x, y } : s),
      };
    });
  };

  const addEntity = () => {
    if (!dfd) return;
    const newId = `E${Date.now()}`;
    const newEntity = { id: newId, name: 'New Entity', x: 200, y: 200 };
    setDfd({ ...dfd, externalEntities: [...dfd.externalEntities, newEntity] });
    setSelectedElement(newEntity);
  };

  const addProcess = () => {
    if (!dfd) return;
    const newId = `P${Date.now()}`;
    const newProcess = { id: newId, number: (dfd.processes.length + 1).toString(), name: 'New Process', x: 400, y: 400 };
    setDfd({ ...dfd, processes: [...dfd.processes, newProcess] });
    setSelectedElement(newProcess);
  };

  const addStore = () => {
    if (!dfd) return;
    const newId = `D${Date.now()}`;
    const newStore = { id: newId, name: 'New Data Store', prefix: 'DB', x: 600, y: 600 };
    setDfd({ ...dfd, dataStores: [...dfd.dataStores, newStore] });
    setSelectedElement(newStore);
  };

  const addDataFlow = () => {
    if (!dfd) return;
    const newId = `F${Date.now()}`;
    const newFlow = { id: newId, sourceId: '', targetId: '', label: 'New Flow', protocol: 'standard' as const };
    setDfd({ ...dfd, dataFlows: [...dfd.dataFlows, newFlow] });
    setSelectedElement(newFlow);
  };

  const updateSelectedElement = (updates: any) => {
    if (!dfd || !selectedElement) return;
    setDfd(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        externalEntities: prev.externalEntities.map(e => e.id === selectedElement.id ? { ...e, ...updates } : e),
        processes: prev.processes.map(p => p.id === selectedElement.id ? { ...p, ...updates } : p),
        dataStores: prev.dataStores.map(s => s.id === selectedElement.id ? { ...s, ...updates } : s),
        dataFlows: prev.dataFlows.map(f => f.id === selectedElement.id ? { ...f, ...updates } : f),
      };
    });
    setSelectedElement({ ...selectedElement, ...updates });
  };

  const deleteElement = () => {
    if (!dfd || !selectedElement) return;
    setDfd(prev => {
      if (!prev) return prev;
      const idToDelete = selectedElement.id;
      return {
        ...prev,
        externalEntities: prev.externalEntities.filter(e => e.id !== idToDelete),
        processes: prev.processes.filter(p => p.id !== idToDelete),
        dataStores: prev.dataStores.filter(s => s.id !== idToDelete),
        dataFlows: prev.dataFlows.filter(f => f.id !== idToDelete && f.sourceId !== idToDelete && f.targetId !== idToDelete),
      };
    });
    setSelectedElement(null);
  };

  const exportImage = () => {
    const svgElement = document.querySelector('svg');
    if (!svgElement) return;
    const container = svgElement.querySelector('.main-container') as SVGGElement;
    if (!container) return;
    const bbox = container.getBBox();
    const padding = 100;
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('width', (bbox.width + padding * 2).toString());
    clonedSvg.setAttribute('height', (bbox.height + padding * 2).toString());
    clonedSvg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
    const clonedGroup = clonedSvg.querySelector('.main-container');
    if (clonedGroup) clonedGroup.setAttribute('transform', 'translate(0,0) scale(1)');
    const style = document.createElement('style');
    style.textContent = `text { font-family: 'Inter', system-ui, sans-serif; } .links path { stroke-linecap: round; stroke-linejoin: round; }`;
    clonedSvg.insertBefore(style, clonedSvg.firstChild);
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const pixelRatio = 4;
      canvas.width = (bbox.width + padding * 2) * pixelRatio;
      canvas.height = (bbox.height + padding * 2) * pixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(pixelRatio, pixelRatio);
        ctx.drawImage(img, 0, 0);
        try {
          const pngUrl = canvas.toDataURL('image/png', 1.0);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `${dfd?.title?.replace(/\s+/g, '_') || 'dfd_architecture'}.png`;
          link.click();
        } catch (err) { console.error("Export failed:", err); }
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* API Key Prompt */}
      {showKeyPrompt && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <KeyIcon className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">API Key Required</h2>
            <p className="text-slate-500 text-sm mt-4 leading-relaxed">Please connect your Google Cloud API key to use the AI features.</p>
            <button onClick={handleOpenKeySelector} className="mt-8 w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all">Select API Key</button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`w-[420px] flex flex-col border-r border-slate-200 bg-white shadow-sm z-10 transition-all duration-500 overflow-hidden ${isManualEdit ? 'w-0 border-none' : ''}`}>
        <header className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg"><PlusIcon className="w-5 h-5 text-white" /></div>
            <h1 className="font-bold text-lg tracking-tight">DFD Architect</h1>
          </div>
          <button onClick={() => { setDfd(null); setMessages([]); setPendingImage(null); }} className="p-1.5 hover:bg-slate-800 rounded-md transition-colors"><TrashIcon className="w-5 h-5" /></button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center animate-in zoom-in duration-1000">
                <PhotoIcon className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Analyze & Architect</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Upload a diagram to begin.</p>
              <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-xl active:scale-95 flex items-center gap-2">
                <ArrowUpTrayIcon className="w-5 h-5" /> Upload
              </button>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}>
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'}`}>
                {msg.image && <img src={msg.image} className="rounded-lg mb-3 border border-black/5" alt="diagram" />}
                <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
                {msg.suggestedPrompts && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {msg.suggestedPrompts.map((p, i) => (
                      <button key={i} onClick={() => handleSend(p)} className="bg-white/80 hover:bg-white text-[10px] py-1 px-3 rounded-full border border-slate-300 font-black uppercase text-slate-600 shadow-sm transition-all">
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isAnalyzing && (
            <div className="flex items-center gap-3 p-4 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] animate-pulse">
              Architecting Solution...
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          {pendingImage && (
            <div className="mb-2 relative inline-block group">
              <img src={pendingImage} className="h-20 w-20 object-cover rounded-lg border-2 border-blue-500 shadow-lg" alt="pending" />
              <button onClick={() => setPendingImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md group-hover:scale-110 transition-transform"><XMarkIcon className="w-4 h-4" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => chatImageInputRef.current?.click()} className="p-3 text-slate-400 hover:text-blue-600 bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm"><PhotoIcon className="w-6 h-6" /></button>
            <div className="flex-1 relative">
              <textarea rows={1} value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Modify this architecture..." className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm transition-all font-medium" />
              <button onClick={() => handleSend()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transition-all active:scale-95"><ChatBubbleLeftRightIcon className="w-5 h-5" /></button>
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleInitialUpload} className="hidden" accept="image/*" />
          <input type="file" ref={chatImageInputRef} onChange={(e) => {
             const file = e.target.files?.[0];
             if (file) {
               const reader = new FileReader();
               reader.onload = (ev) => setPendingImage(ev.target?.result as string);
               reader.readAsDataURL(file);
             }
          }} className="hidden" accept="image/*" />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-2">
            {dfd ? (
              <div className="flex items-center gap-3">
                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase shadow-sm">AI ARCHITECT</span>
                <h2 className="font-black text-slate-800 tracking-tight text-lg truncate max-w-[300px]">{dfd.title}</h2>
              </div>
            ) : (
              <span className="text-slate-400 font-black text-xs uppercase tracking-widest">Architectural Canvas</span>
            )}
          </div>
          <div className="flex gap-2">
            {dfd && (
              <>
                <button 
                  onClick={() => setIsManualEdit(!isManualEdit)} 
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-black uppercase transition-all border-b-2 active:translate-y-0.5 active:border-b-0 ${isManualEdit ? 'bg-amber-500 text-white border-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <PencilSquareIcon className="w-4 h-4" /> {isManualEdit ? 'Exit Edit' : 'Manual Edit'}
                </button>
                <button onClick={exportImage} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 hover:bg-slate-50 shadow-sm transition-all border-b-2 active:translate-y-0.5 active:border-b-0">
                  <CameraIcon className="w-4 h-4 text-emerald-500" /> Export PNG
                </button>
              </>
            )}
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-black uppercase shadow-xl hover:bg-blue-700 transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">
              <PlusIcon className="w-5 h-5" /> New Project
            </button>
          </div>
        </header>

        <div className="flex-1 relative bg-white overflow-hidden p-8">
          {dfd ? (
            <div className="w-full h-full relative">
              <DFDCanvas 
                structure={dfd} 
                onSelectElement={setSelectedElement} 
                isEditMode={isManualEdit}
                onUpdateElementPosition={updateElementPosition}
              />
              
              {/* Visual Editor Toolbar */}
              {isManualEdit && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-slate-200 animate-in slide-in-from-top-4 duration-500 z-30">
                  <button onClick={addEntity} title="Add External Entity" className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <UserIcon className="w-5 h-5" /> Entity
                  </button>
                  <button onClick={addProcess} title="Add New Process" className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <SquaresPlusIcon className="w-5 h-5" /> Process
                  </button>
                  <button onClick={addStore} title="Add Data Store" className="p-3 bg-slate-100 text-slate-800 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <ArchiveBoxIcon className="w-5 h-5" /> Store
                  </button>
                  <div className="w-px bg-slate-200 h-10 mx-1"></div>
                  <button onClick={addDataFlow} title="Create New Flow" className="p-3 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <LinkIcon className="w-5 h-5" /> New Flow
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full border-4 border-dashed border-slate-100 rounded-[3rem] flex items-center justify-center bg-slate-50/50 cursor-pointer group hover:bg-blue-50/30 transition-all" onClick={() => fileInputRef.current?.click()}>
              <div className="text-center p-12 bg-white rounded-[2.5rem] shadow-2xl max-w-sm transform group-hover:-translate-y-4 transition-all duration-700 border border-slate-100 ring-1 ring-black/5">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner transform group-hover:scale-110 transition-transform">
                   <ArrowUpTrayIcon className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Initialize Designer</h3>
                <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed uppercase tracking-wider">Drop a screenshot to begin architecting</p>
              </div>
            </div>
          )}
        </div>

        {/* Visual Element Inspector */}
        {selectedElement && (
          <div className="absolute top-24 right-10 w-80 bg-white/98 backdrop-blur-xl border border-slate-200 rounded-[2rem] shadow-2xl p-6 z-40 animate-in fade-in slide-in-from-right-8 duration-500 ring-1 ring-black/5 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Element Inspector</h4>
              <button onClick={() => setSelectedElement(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              {/* Common Label/Name Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Label / Name</label>
                <input 
                  type="text" 
                  value={selectedElement.name || selectedElement.label || ''} 
                  onChange={(e) => updateSelectedElement(selectedElement.sourceId !== undefined ? { label: e.target.value } : { name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Process Number */}
              {selectedElement.number !== undefined && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Process #</label>
                  <input 
                    type="text" 
                    value={selectedElement.number} 
                    onChange={(e) => updateSelectedElement({ number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}

              {/* Protocol / Type Styling */}
              {selectedElement.protocol !== undefined && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Protocol</label>
                  <select 
                    value={selectedElement.protocol} 
                    onChange={(e) => updateSelectedElement({ protocol: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 outline-none"
                  >
                    <option value="standard">Standard (Gray)</option>
                    <option value="https">HTTPS (Blue)</option>
                    <option value="sql">SQL (Orange)</option>
                  </select>
                </div>
              )}

              {/* Source/Target Selection for Flows */}
              {selectedElement.sourceId !== undefined && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Source Node</label>
                    <select 
                      value={selectedElement.sourceId} 
                      onChange={(e) => updateSelectedElement({ sourceId: e.target.value })} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="">-- Select Source --</option>
                      {allNodes.map(node => (
                        <option key={node.id} value={node.id}>{node.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Node</label>
                    <select 
                      value={selectedElement.targetId} 
                      onChange={(e) => updateSelectedElement({ targetId: e.target.value })} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="">-- Select Target --</option>
                      {allNodes.map(node => (
                        <option key={node.id} value={node.id}>{node.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={deleteElement} 
                className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-100"
              >
                Delete Item
              </button>
              <button 
                onClick={() => setSelectedElement(null)} 
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        {dfd && !isManualEdit && (
          <div className="absolute bottom-10 left-10 flex flex-wrap gap-4 md:gap-6 bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-2xl z-20 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 animate-in fade-in slide-in-from-left-10 duration-1000">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#0c122b] shadow-sm"></div>Entity</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#8a9fdd] rounded-sm shadow-sm"></div>Process</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#f1f5f9] border border-slate-300 shadow-sm"></div>Data Store</div>
            <div className="w-px h-4 bg-slate-200 mx-2 hidden md:block"></div>
            <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-blue-500"></div>HTTPS</div>
            <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-orange-400"></div>SQL</div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
