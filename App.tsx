
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GeminiService } from './services/geminiService';
import { DFDStructure, ChatMessage, DFDEntity, DFDProcess, DFDDataStore, DFDDataFlow } from './types';
import DFDCanvas from './components/DFDCanvas';
import LandingPage from './components/LandingPage';
import { 
  PlusIcon, 
  ArrowUpTrayIcon, 
  ChatBubbleLeftRightIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  CameraIcon,
  PencilSquareIcon,
  SquaresPlusIcon,
  LinkIcon,
  ArchiveBoxIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon as DownloadIcon,
  ArrowsRightLeftIcon,
  TableCellsIcon,
  HomeIcon,
  UserGroupIcon,
  CogIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'workspace'>('home');
  const [dfd, setDfd] = useState<DFDStructure | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gemini = useRef(new GeminiService());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAnalyzing]);

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

  const processInitialResult = (result: any) => {
    if (result.updated_dfd) {
      setDfd(result.updated_dfd);
      addMessage('assistant', result.message, { suggestedPrompts: result.suggested_prompts });
      setView('workspace');
    }
  };

  const handleInitialUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    if (view !== 'workspace') setView('workspace');
    
    const previewUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      addMessage('user', `Uploaded diagram: ${file.name}`, { image: previewUrl });
      try {
        const result = await gemini.current.analyzeInitialImage(base64);
        processInitialResult(result);
      } catch (error: any) {
        addMessage('system', error.message || "Deep analysis failed. Please ensure the architecture is clearly visible.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    if (view !== 'workspace') setView('workspace');
    addMessage('user', `Uploaded CSV data: ${file.name}`);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const result = await gemini.current.analyzeCSV(text);
        processInitialResult(result);
      } catch (error: any) {
        addMessage('system', "Failed to process CSV. Architecture logic may be malformed.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleSend = async (text?: string) => {
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
        processInitialResult(result);
      } else if (dfd) {
        const result = await gemini.current.refineDFD(query, dfd, history, currentImage || undefined);
        if (result.updated_dfd) setDfd(result.updated_dfd);
        addMessage('assistant', result.message, { suggestedPrompts: result.suggested_prompts });
      }
    } catch (error: any) {
      addMessage('system', "AI processing error. The Pro model might be experiencing high traffic.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- MANUAL EDITING FUNCTIONS ---

  const addEntity = () => {
    const newId = `e-${Date.now()}`;
    const newEntity: DFDEntity = { id: newId, name: 'New Actor', x: 150, y: 150 };
    setDfd(prev => {
      const base = prev || { externalEntities: [], processes: [], dataStores: [], dataFlows: [] };
      return { ...base, externalEntities: [...base.externalEntities, newEntity] };
    });
    setSelectedElement({ ...newEntity, type: 'entity' });
  };

  const addProcess = () => {
    const newId = `p-${Date.now()}`;
    const newProcess: DFDProcess = { id: newId, name: 'New Logic', number: `${(dfd?.processes.length || 0) + 1}`, x: 300, y: 300 };
    setDfd(prev => {
      const base = prev || { externalEntities: [], processes: [], dataStores: [], dataFlows: [] };
      return { ...base, processes: [...base.processes, newProcess] };
    });
    setSelectedElement({ ...newProcess, type: 'process' });
  };

  const addStore = () => {
    const newId = `s-${Date.now()}`;
    const newStore: DFDDataStore = { id: newId, name: 'Data Repository', prefix: 'DB', x: 450, y: 450 };
    setDfd(prev => {
      const base = prev || { externalEntities: [], processes: [], dataStores: [], dataFlows: [] };
      return { ...base, dataStores: [...base.dataStores, newStore] };
    });
    setSelectedElement({ ...newStore, type: 'store' });
  };

  const addFlow = () => {
    if (!dfd) return;
    const newId = `f-${Date.now()}`;
    const nodes = [...dfd.externalEntities, ...dfd.processes, ...dfd.dataStores];
    if (nodes.length < 2) {
      addMessage('system', 'Add at least two elements to create a data flow.');
      return;
    }
    const newFlow: DFDDataFlow = { id: newId, sourceId: nodes[0].id, targetId: nodes[1].id, label: 'Syncing Data', protocol: 'standard' };
    setDfd(prev => prev ? { ...prev, dataFlows: [...prev.dataFlows, newFlow] } : prev);
    setSelectedElement({ ...newFlow });
  };

  const deleteElement = (id: string) => {
    setDfd(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        externalEntities: prev.externalEntities.filter(e => e.id !== id),
        processes: prev.processes.filter(p => p.id !== id),
        dataStores: prev.dataStores.filter(s => s.id !== id),
        dataFlows: prev.dataFlows.filter(f => f.id !== id && f.sourceId !== id && f.targetId !== id),
      };
    });
    setSelectedElement(null);
  };

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

  const exportJSON = () => {
    if (!dfd) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dfd, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${dfd.title?.replace(/\s+/g, '_') || 'architectural_schema'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportImage = () => {
    const svgElement = document.querySelector('svg');
    if (!svgElement) return;

    const mainContainer = svgElement.querySelector('.main-container');
    if (!mainContainer) return;

    const bbox = (mainContainer as SVGGElement).getBBox();
    const padding = 80;
    
    const width = bbox.width + padding * 2;
    const height = bbox.height + padding * 2;

    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('width', width.toString());
    clonedSvg.setAttribute('height', height.toString());
    clonedSvg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
    
    const clonedMainG = clonedSvg.querySelector('.main-container');
    if (clonedMainG) {
      clonedMainG.setAttribute('transform', 'translate(0,0) scale(1)');
    }

    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      text { font-family: 'Inter', system-ui, sans-serif; }
      .link-path { stroke-linecap: round; stroke-linejoin: round; }
    `;
    clonedSvg.insertBefore(style, clonedSvg.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const canvas = document.createElement('canvas');
    const scaleFactor = 2; 
    canvas.width = width * scaleFactor;
    canvas.height = height * scaleFactor;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(img, 0, 0, width, height);
      
      const pngUrl = canvas.toDataURL('image/png', 1.0);
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${dfd?.title?.replace(/\s+/g, '_') || 'dfd_architecture_pro'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const allNodesList = useMemo(() => {
    if (!dfd) return [];
    return [
      ...dfd.externalEntities.map(e => ({ id: e.id, name: `[Actor] ${e.name}` })),
      ...dfd.processes.map(p => ({ id: p.id, name: `[Logic ${p.number}] ${p.name}` })),
      ...dfd.dataStores.map(s => ({ id: s.id, name: `[Store] ${s.name}` }))
    ];
  }, [dfd]);

  if (view === 'home') {
    return (
      <LandingPage 
        onStart={() => setView('workspace')} 
        onUpload={() => fileInputRef.current?.click()} 
        onCSV={() => csvInputRef.current?.click()} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden selection:bg-blue-100">
      {/* Sidebar Chat Interface */}
      <div className={`${isChatVisible ? 'w-[450px]' : 'w-0'} flex flex-col bg-white border-r border-slate-200 transition-all duration-500 overflow-hidden relative shadow-2xl z-20`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
                <SquaresPlusIcon className="w-5 h-5 text-white" />
             </div>
             <div>
                <h1 className="text-sm font-black uppercase tracking-tighter">Pro Architect</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gemini 3 Pro Active</p>
             </div>
          </div>
          <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900">
             <HomeIcon className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50/30">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
               <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-400 animate-bounce">
                  <ChatBubbleLeftRightIcon className="w-8 h-8" />
               </div>
               <div className="space-y-2">
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Architecture Assistant</h3>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">Describe a system or upload an image. The Pro model will meticulously map actors, flows, and bidirectional syncs.</p>
               </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] space-y-2`}>
                <div className={`p-4 rounded-3xl shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : m.role === 'system'
                    ? 'bg-red-50 text-red-600 border border-red-100'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}>
                  {m.image && (
                    <img src={m.image} alt="Upload" className="w-full h-48 object-cover rounded-2xl mb-3 shadow-inner" />
                  )}
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>
                {m.suggestedPrompts && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {m.suggestedPrompts.map((p, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleSend(p)}
                        className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 px-3 py-1.5 rounded-full transition-all shadow-sm"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isAnalyzing && (
            <div className="flex justify-start animate-pulse">
               <div className="bg-white border border-slate-200 p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-3">
                  <div className="flex gap-1">
                     <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                     <div className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-blue-600">Pro reasoning active...</span>
               </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-200 space-y-4">
          {pendingImage && (
            <div className="relative inline-block group">
              <img src={pendingImage} alt="Pending" className="w-20 h-20 object-cover rounded-2xl border-4 border-white shadow-xl" />
              <button 
                onClick={() => setPendingImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button 
              onClick={() => chatImageInputRef.current?.click()}
              className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
            >
              <PhotoIcon className="w-6 h-6" />
            </button>
            <div className="flex-1 relative">
              <input 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Modify logic or add entities..."
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-medium placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
              <button 
                onClick={() => handleSend()}
                disabled={isAnalyzing}
                className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col relative h-full bg-white">
        {/* Toggle Chat View Button */}
        <button 
          onClick={() => setIsChatVisible(!isChatVisible)}
          className={`absolute top-1/2 -left-4 z-30 p-2 bg-white border border-slate-200 rounded-full shadow-xl transition-all hover:scale-110 text-slate-400 hover:text-blue-600 ${isChatVisible ? '' : 'translate-x-4'}`}
        >
          {isChatVisible ? <ChevronLeftIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
        </button>

        {/* Global Toolbar */}
        <div className="p-6 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
            <button 
              onClick={() => setIsManualEdit(!isManualEdit)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isManualEdit 
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' 
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <PencilSquareIcon className="w-4 h-4" />
              {isManualEdit ? 'Creative Edit' : 'Edit Mode'}
            </button>
            
            <div className="w-px h-6 bg-slate-200"></div>

            {isManualEdit ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-left-4 duration-300">
                <button onClick={addEntity} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-2 px-3 group" title="Add Actor">
                  <UserGroupIcon className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase hidden group-hover:block">Actor</span>
                </button>
                <button onClick={addProcess} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-2 px-3 group" title="Add Logic">
                  <CogIcon className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase hidden group-hover:block">Logic</span>
                </button>
                <button onClick={addStore} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-2 px-3 group" title="Add Store">
                  <CircleStackIcon className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase hidden group-hover:block">Store</span>
                </button>
                <button onClick={addFlow} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-2 px-3 group" title="Add Flow">
                  <LinkIcon className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase hidden group-hover:block">Flow</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Upload Image">
                  <PhotoIcon className="w-5 h-5" />
                </button>
                <button onClick={() => csvInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Import CSV">
                  <TableCellsIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
            <button onClick={exportImage} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95">
              <CameraIcon className="w-4 h-4" />
              High-Res PNG
            </button>
            <button onClick={exportJSON} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all active:scale-95">
              <DownloadIcon className="w-4 h-4" />
              JSON Schema
            </button>
          </div>
        </div>

        {/* Dynamic DFD Canvas */}
        <div className="flex-1 p-6 pt-0 relative group min-h-0">
          {dfd ? (
            <DFDCanvas 
              structure={dfd} 
              isEditMode={isManualEdit}
              onSelectElement={setSelectedElement}
              onUpdateElementPosition={updateElementPosition}
            />
          ) : (
            <div className="w-full h-full bg-slate-50 rounded-[2.5rem] border-8 border-white shadow-2xl flex flex-col items-center justify-center p-12 space-y-8">
               <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center relative shadow-sm">
                  <div className="absolute inset-0 border-4 border-dashed border-slate-200 rounded-full animate-[spin_20s_linear_infinite]"></div>
                  <SquaresPlusIcon className="w-12 h-12 text-slate-300" />
               </div>
               <div className="text-center space-y-2 max-w-sm">
                  <h2 className="text-xl font-black uppercase tracking-tighter">Pro Workspace Ready</h2>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">Upload a screenshot or architectural CSV. The Pro model will parse your system's actors and flows automatically.</p>
               </div>
               <div className="flex gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3"
                  >
                    Analyze Diagram
                    <ArrowUpTrayIcon className="w-5 h-5" />
                  </button>
               </div>
            </div>
          )}

          {/* Contextual Inspector Sidebar */}
          {selectedElement && (
            <div className="absolute top-6 right-12 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-6 animate-in slide-in-from-right-8 duration-500 z-30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Inspector</h3>
                </div>
                <button onClick={() => setSelectedElement(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Label / Name</label>
                  <input 
                    value={selectedElement.name || selectedElement.label || ''} 
                    onChange={(e) => updateSelectedElement({ name: e.target.value, label: e.target.value })}
                    className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                
                {selectedElement.type === 'process' && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Process Number</label>
                    <input 
                      value={selectedElement.number || ''} 
                      onChange={(e) => updateSelectedElement({ number: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                )}

                {selectedElement.sourceId && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">From</label>
                         <select 
                           value={selectedElement.sourceId}
                           onChange={(e) => updateSelectedElement({ sourceId: e.target.value })}
                           className="w-full bg-slate-100 border-none rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none"
                         >
                            {allNodesList.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                         </select>
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">To</label>
                         <select 
                           value={selectedElement.targetId}
                           onChange={(e) => updateSelectedElement({ targetId: e.target.value })}
                           className="w-full bg-slate-100 border-none rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none"
                         >
                            {allNodesList.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                         </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Protocol</label>
                         <select 
                           value={selectedElement.protocol || 'standard'}
                           onChange={(e) => updateSelectedElement({ protocol: e.target.value })}
                           className="w-full bg-slate-100 border-none rounded-xl px-3 py-2.5 text-[10px] font-bold outline-none"
                         >
                            <option value="standard">Standard</option>
                            <option value="https">HTTPS (Blue)</option>
                            <option value="sql">SQL (Orange)</option>
                         </select>
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Direction</label>
                         <button 
                           onClick={() => updateSelectedElement({ isBidirectional: !selectedElement.isBidirectional })}
                           className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                             selectedElement.isBidirectional ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'
                           }`}
                         >
                           {selectedElement.isBidirectional ? 'Bidir' : 'Unidir'}
                         </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 flex gap-2">
                   <button 
                    onClick={() => deleteElement(selectedElement.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                   >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                   </button>
                   <button 
                    onClick={() => setSelectedElement(null)}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                   >
                      Apply
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Internal File Handlers */}
      <input type="file" ref={fileInputRef} onChange={handleInitialUpload} accept="image/*" className="hidden" />
      <input type="file" ref={csvInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />
      <input 
        type="file" 
        ref={chatImageInputRef} 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (re) => setPendingImage(re.target?.result as string);
            reader.readAsDataURL(file);
          }
        }} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
};

export default App;
