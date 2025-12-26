
import React from 'react';
import { 
  ArrowUpTrayIcon, 
  TableCellsIcon, 
  BoltIcon, 
  ChatBubbleBottomCenterTextIcon, 
  CircleStackIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CursorArrowRaysIcon
} from '@heroicons/react/24/outline';

interface LandingPageProps {
  onStart: () => void;
  onUpload: () => void;
  onCSV: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onUpload, onCSV }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg uppercase tracking-tighter">DFD Architect</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onStart} 
              className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={onStart} 
              className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
              <BoltIcon className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">AI-Powered Systems Design</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tighter">
              Transform Ideas into <span className="text-blue-600 italic">Architecture</span>.
            </h1>
            <p className="text-xl text-slate-500 max-w-lg leading-relaxed font-medium">
              Upload a screenshot or import a CSV. Our AI engine meticulously analyzes flows to build professional Data Flow Diagrams in seconds.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={onStart}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all hover:-translate-y-1 flex items-center gap-3 active:scale-95"
              >
                Start Designing Free
                <CursorArrowRaysIcon className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                <button onClick={onUpload} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-slate-600" title="Quick Upload Image">
                  <ArrowUpTrayIcon className="w-6 h-6" />
                </button>
                <button onClick={onCSV} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-slate-600" title="Import CSV">
                  <TableCellsIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-6 pt-4 grayscale opacity-40">
              <span className="text-xs font-bold uppercase tracking-widest">Supports</span>
              <div className="flex gap-4 items-center">
                <div className="h-4 w-px bg-slate-300"></div>
                <span className="text-sm font-black italic">Lucidchart</span>
                <span className="text-sm font-black italic">Visio</span>
                <span className="text-sm font-black italic">Draw.io</span>
              </div>
            </div>
          </div>

          <div className="relative animate-in fade-in zoom-in duration-1000 delay-200">
            <div className="absolute -inset-4 bg-blue-500/10 blur-3xl rounded-[4rem]"></div>
            <div className="relative bg-white border-8 border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] rounded-[3rem] overflow-hidden aspect-[4/3] flex flex-col">
              <div className="h-10 bg-slate-100 flex items-center px-4 gap-1.5 border-b border-slate-200">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
              </div>
              <div className="flex-1 bg-slate-50 flex items-center justify-center p-8">
                 <div className="w-full h-full border-2 border-dashed border-blue-200 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-blue-300">
                    <SparklesIcon className="w-16 h-16 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">AI Canvas Preview</span>
                 </div>
              </div>
              {/* Floating element */}
              <div className="absolute top-1/4 -right-8 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 animate-bounce duration-[4000ms]">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                   </div>
                   <div className="space-y-1">
                      <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
                      <div className="h-1.5 w-12 bg-slate-100 rounded-full"></div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black tracking-tight uppercase">Powerful Architecture Engine</h2>
            <p className="text-slate-500 font-medium">Everything you need to visualize complex system logic.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<SparklesIcon />}
              title="Image Synthesis"
              description="Upload screenshots from Lucidchart, Visio, or whiteboards. Our AI detects nodes and bidirectional flows with 98% accuracy."
            />
            <FeatureCard 
              icon={<TableCellsIcon />}
              title="CSV Blueprinting"
              description="Already have structured data? Import your CSV and watch the architecture self-assemble instantly on our dynamic canvas."
            />
            <FeatureCard 
              icon={<ChatBubbleBottomCenterTextIcon />}
              title="LLM Refinement"
              description="Don't just draw, converse. Ask AI to 'add a secure SQL connection between process A and B' and watch it happen."
            />
            <FeatureCard 
              icon={<CircleStackIcon />}
              title="Enterprise Stores"
              description="Built-in recognition for standard DFD components like External Entities, Processes, and dedicated Data Stores."
            />
            <FeatureCard 
              icon={<ShieldCheckIcon />}
              title="Secure Protocols"
              description="Detect and visualize security protocols like HTTPS and SQL natively with color-coded, logical pathing."
            />
            <FeatureCard 
              icon={<ArrowUpTrayIcon />}
              title="Production Export"
              description="Export high-resolution PNGs for presentations or download the raw JSON schema for version control and CI/CD."
            />
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 blur-[120px]"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <h2 className="text-5xl font-black leading-tight tracking-tighter uppercase">The Future of <br/><span className="text-blue-500">System Design</span></h2>
              
              <div className="space-y-8">
                <Step number="01" title="Input Data" text="Upload an image or paste CSV data to provide the structural foundation." />
                <Step number="02" title="AI Architecting" text="Gemini Flash processes the logic, identifying dependencies and flow directions." />
                <Step number="03" title="Live Collaboration" text="Iterate via chat or manual editor to fine-tune every process and entity." />
              </div>

              <button 
                onClick={onStart}
                className="group inline-flex items-center gap-4 text-xl font-black uppercase tracking-widest hover:text-blue-400 transition-colors"
              >
                Get Started Now
                <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                   <CursorArrowRaysIcon className="w-6 h-6" />
                </div>
              </button>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 shadow-2xl">
              <div className="aspect-square bg-slate-900 rounded-[2rem] border border-white/5 flex flex-col p-6 space-y-4">
                <div className="flex justify-between items-center">
                   <div className="flex gap-1">
                      <div className="w-12 h-3 bg-blue-500/50 rounded-full"></div>
                      <div className="w-6 h-3 bg-slate-700 rounded-full"></div>
                   </div>
                   <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                   <div className="relative w-48 h-48 border border-slate-700 rounded-full flex items-center justify-center">
                      <div className="w-32 h-32 bg-blue-600/20 rounded-full animate-pulse blur-xl"></div>
                      <SparklesIcon className="w-12 h-12 text-blue-500 absolute" />
                      <div className="absolute -top-4 left-1/2 w-8 h-8 bg-slate-700 rounded-lg"></div>
                      <div className="absolute -bottom-4 left-1/2 w-8 h-8 bg-slate-700 rounded-lg"></div>
                      <div className="absolute left-0 top-1/2 w-8 h-8 bg-slate-700 rounded-lg"></div>
                      <div className="absolute right-0 top-1/2 w-8 h-8 bg-slate-700 rounded-lg"></div>
                   </div>
                </div>
                <div className="space-y-2">
                   <div className="h-2 w-full bg-slate-800 rounded-full"></div>
                   <div className="h-2 w-2/3 bg-slate-800 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1.5 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg uppercase tracking-tighter">DFD Architect</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">© 2025 AI DFD Architect. Professional Systems Design.</p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-slate-900 text-xs font-bold uppercase tracking-widest transition-colors">Twitter</a>
            <a href="#" className="text-slate-400 hover:text-slate-900 text-xs font-bold uppercase tracking-widest transition-colors">GitHub</a>
            <a href="#" className="text-slate-400 hover:text-slate-900 text-xs font-bold uppercase tracking-widest transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/5 transition-all group">
    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
      {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
    </div>
    <h3 className="text-lg font-black uppercase tracking-tight mb-3 text-slate-900">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed font-medium">{description}</p>
  </div>
);

const Step: React.FC<{ number: string, title: string, text: string }> = ({ number, title, text }) => (
  <div className="flex gap-6 items-start">
    <span className="text-4xl font-black text-slate-800 tabular-nums">{number}</span>
    <div className="space-y-1">
      <h4 className="text-lg font-black uppercase tracking-widest text-blue-500">{title}</h4>
      <p className="text-slate-400 font-medium leading-relaxed max-w-sm">{text}</p>
    </div>
  </div>
);

export default LandingPage;
