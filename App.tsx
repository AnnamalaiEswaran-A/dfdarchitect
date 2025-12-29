
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
        addMessage('system', error.message || "Analysis failed. Please try a clearer diagram.");
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
        addMessage('system', "Failed to process CSV.");
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
      addMessage('system', "AI processing error.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addEntity = () => {
    const newId = `e-${Date.now()}`;
    const newEntity: DFDEntity = { id: newId, name: 'New Actor', x: 200, y: 200 };
    setDfd(prev => {
      const base = prev || { externalEntities: [], processes: [], dataStores: [], dataFlows: [] };
      return { ...base, externalEntities: [...base.externalEntities, newEntity] };
    });
    setSelectedElement({ ...newEntity, type: 'entity' });
  };

  const addProcess = () => {
    const newId = `p-${Date.now()}`;
    const newProcess: DFDProcess = { id: newId, name: 'New Logic', number: `${(dfd?.processes.length || 0) + 1}`, x: 400, y: 400 };
    setDfd(prev => {
      const base = prev || { externalEntities: [], processes: [], dataStores: [], dataFlows: [] };
      return { ...base, processes: [...base.processes, newProcess] };
    });
    setSelectedElement({ ...newProcess, type: 'process' });
  };

  const addStore = () => {
    const newId = `s-${Date.now()}`;
    const newStore: DFDDataStore = { id: newId, name: 'New Store', prefix: 'DB', x: 600, y: 600 };
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
    if (nodes.length < 2) return;
    const newFlow: DFDDataFlow = { id: newId, sourceId: nodes[0].id, targetId: nodes[1].id, label: 'Data Sync', protocol: 'standard' };
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
    downloadAnchorNode.setAttribute("download", `dfd_schema.json`);
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
    const padding = 60;
    const width = bbox.width + padding * 2;
    const height = bbox.height + padding * 2;

    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('width', width.toString());
    clonedSvg.setAttribute('height', height.toString());
    clonedSvg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
    
    const clonedMainG = clonedSvg.querySelector('.main-container');
    if (clonedMainG) clonedMainG.setAttribute('transform', 'translate(0,0) scale(1)');

    const style = document.createElement('style');
    style.textContent = `text { font-family: 'Inter', sans-serif; } .link-path { stroke-linecap: round; }`;
    clonedSvg.insertBefore(style, clonedSvg.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, width, height);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `dfd_export.png`;
      link.click();
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
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Chat */}
      <div className={`${isChatVisible ? 'w-[400px]' : 'w-0'} flex flex-col bg-white border-r border-slate-200 transition-all duration-300 overflow-hidden relative shadow-xl z-20`}>
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
                <SquaresPlusIcon className="w-5 h-5 text-white" />
             </div>
             <h1 className="text-xs font-black uppercase tracking-widest">DFD Architect</h1>
          </div>
          <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
             <HomeIcon className="w-5 h-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/20">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-50">
               <ChatBubbleLeftRightIcon className="w-10 h-10 text-blue-400" />
               <p className="text-xs font-bold uppercase tracking-widest">Chat with AI to build flows</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-3 rounded-2xl shadow-sm text-sm ${
                m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 rounded-tl-none'
              }`}>
                {m.image && <img src={m.image} className="w-full rounded-xl mb-2" />}
                <p className="font-medium leading-relaxed">{m.content}</p>
                {m.suggestedPrompts && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {m.suggestedPrompts.map((p, i) => (
                      <button key={i} onClick={() => handleSend(p)} className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-all">
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isAnalyzing && (
            <div className="flex justify-start animate-pulse p-3 bg-white border rounded-2xl w-max">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Architecting...</span>
            </div>
          )}
        </div>

        <div className="p-5 border-t space-y-3">
          {pendingImage && (
            <div className="relative inline-block">
              <img src={pendingImage} className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-lg" />
              <button onClick={() => setPendingImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg">
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => chatImageInputRef.current?.click()} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:text-blue-600 transition-all">
              <PhotoIcon className="w-6 h-6" />
            </button>
            <div className="flex-1 relative">
              <input 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask AI to modify..."
                className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col relative bg-white">
        <button onClick={() => setIsChatVisible(!isChatVisible)} className="absolute top-1/2 -left-4 z-30 p-2 bg-white border border-slate-200 rounded-full shadow-lg text-slate-400 hover:text-blue-600">
          {isChatVisible ? <ChevronLeftIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
        </button>

        {/* Toolbar */}
        <div className="p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border shadow-sm">
            <button 
              onClick={() => setIsManualEdit(!isManualEdit)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                isManualEdit ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <PencilSquareIcon className="w-4 h-4" />
              {isManualEdit ? 'Creative Edit' : 'Edit Mode'}
            </button>
            <div className="w-px h-5 bg-slate-200"></div>
            {isManualEdit ? (
              <div className="flex items-center gap-1 animate-in slide-in-from-left-2">
                <button onClick={addEntity} className="p-2 text-slate-600 hover:text-blue-600 rounded-lg group relative" title="Add Actor">
                  <UserGroupIcon className="w-5 h-5" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Actor</span>
                </button>
                <button onClick={addProcess} className="p-2 text-slate-600 hover:text-blue-600 rounded-lg group relative" title="Add Logic">
                  <CogIcon className="w-5 h-5" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Logic</span>
                </button>
                <button onClick={addStore} className="p-2 text-slate-600 hover:text-blue-600 rounded-lg group relative" title="Add Store">
                  <CircleStackIcon className="w-5 h-5" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Store</span>
                </button>
                <button onClick={addFlow} className="p-2 text-slate-600 hover:text-blue-600 rounded-lg group relative" title="Add Flow">
                  <LinkIcon className="w-5 h-5" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Flow</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-1">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><PhotoIcon className="w-5 h-5" /></button>
                <button onClick={() => csvInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><TableCellsIcon className="w-5 h-5" /></button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={exportImage} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2">
              <CameraIcon className="w-4 h-4" /> Export PNG
            </button>
            <button onClick={exportJSON} className="bg-white border text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2">
              <DownloadIcon className="w-4 h-4" /> JSON
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-4 pt-0 relative">
          {dfd ? (
            <DFDCanvas 
              structure={dfd} 
              isEditMode={isManualEdit}
              onSelectElement={setSelectedElement}
              onUpdateElementPosition={updateElementPosition}
            />
          ) : (
            <div className="w-full h-full bg-slate-50 rounded-[2rem] border-4 border-white shadow-inner flex flex-col items-center justify-center p-10 space-y-6 text-center">
               <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-300">
                  <SquaresPlusIcon className="w-10 h-10" />
               </div>
               <div className="space-y-2">
                  <h2 className="text-sm font-black uppercase tracking-widest">Workspace Ready</h2>
                  <p className="text-xs text-slate-400 font-medium">Upload a diagram to start or click 'Edit Mode' to build manually.</p>
               </div>
               <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95">Analyze Screenshot</button>
            </div>
          )}

          {/* Inspector */}
          {selectedElement && (
            <div className="absolute top-4 right-8 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 z-30 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-5 border-b pb-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Element Properties</h3>
                <button onClick={() => setSelectedElement(null)} className="p-1 text-slate-300 hover:text-slate-600"><XMarkIcon className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Name</label>
                  <input value={selectedElement.name || selectedElement.label || ''} onChange={(e) => updateSelectedElement({ name: e.target.value, label: e.target.value })} className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500/20" />
                </div>
                {selectedElement.sourceId && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">From</label>
                      <select value={selectedElement.sourceId} onChange={(e) => updateSelectedElement({ sourceId: e.target.value })} className="w-full bg-slate-50 border-none rounded-lg px-2 py-2 text-[10px] font-bold outline-none">
                        {allNodesList.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">To</label>
                      <select value={selectedElement.targetId} onChange={(e) => updateSelectedElement({ targetId: e.target.value })} className="w-full bg-slate-50 border-none rounded-lg px-2 py-2 text-[10px] font-bold outline-none">
                        {allNodesList.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-3">
                  <button onClick={() => deleteElement(selectedElement.id)} className="flex-1 py-2 bg-red-50 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Remove</button>
                  <button onClick={() => setSelectedElement(null)} className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Done</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleInitialUpload} accept="image/*" className="hidden" />
      <input type="file" ref={csvInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />
      <input type="file" ref={chatImageInputRef} onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          const r = new FileReader();
          r.onload = (re) => setPendingImage(re.target?.result as string);
          r.readAsDataURL(f);
        }
      }} accept="image/*" className="hidden" />
    </div>
  );
};

export default App;
