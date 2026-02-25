/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Sparkles, 
  Camera as CameraIcon, 
  Download, 
  Share2, 
  ArrowLeft,
  Wand2,
  Info,
  Loader2,
  ChevronRight,
  Clock,
  Save,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { Camera } from './components/Camera';
import { EraSelector } from './components/EraSelector';
import { analyzeImage, transformToEra, ERAS } from './services/gemini';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AppState = 'landing' | 'capture' | 'era-select' | 'generating' | 'result' | 'gallery';

interface SavedPhoto {
  id: string;
  data: string;
  date: string;
}

export default function App() {
  const [state, setState] = useState<AppState>('landing');
  const [photo, setPhoto] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [selectedEraId, setSelectedEraId] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [savedPhotos, setSavedPhotos] = useState<SavedPhoto[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('chronos_saved_portraits');
    if (saved) {
      try {
        setSavedPhotos(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved photos", e);
      }
    }
  }, []);

  const savePhoto = (data: string) => {
  const newPhoto: SavedPhoto = {
    // Fallback ID generation
    id: window.isSecureContext && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15),
    data,
    date: new Date().toLocaleString()
  };
  const updated = [newPhoto, ...savedPhotos].slice(0, 12);
  setSavedPhotos(updated);
  localStorage.setItem('chronos_saved_portraits', JSON.stringify(updated));
  alert("Portrait saved to temporal records!");
};

  const deletePhoto = (id: string) => {
    const updated = savedPhotos.filter(p => p.id !== id);
    setSavedPhotos(updated);
    localStorage.setItem('chronos_saved_portraits', JSON.stringify(updated));
  };

  const handleCapture = async (base64: string) => {
    setPhoto(base64);
    setIsProcessing(true);
    setState('era-select');
    try {
      const result = await analyzeImage(base64);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!photo || !selectedEraId) return;

    const era = ERAS.find(e => e.id === selectedEraId);
    if (!era) return;

    setIsProcessing(true);
    setState('generating');
    try {
      const result = await transformToEra(photo, era.description, undefined, analysis || undefined);
      if (!result) {
        throw new Error('No image was returned from Gemini.');
      }
      setResultImage(result);
      setState('result');
    } catch (err) {
      console.error(err);
      setState('era-select');
      alert("Generation failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualEdit = async () => {
    if (!photo || !editPrompt) return;

    setIsProcessing(true);
    try {
      const result = await transformToEra(photo, "", editPrompt, analysis || undefined);
      if (!result) {
        throw new Error('No image was returned from Gemini.');
      }
      setResultImage(result);
      setState('result');
    } catch (err) {
      console.error(err);
      alert("Edit failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setAnalysis(null);
    setSelectedEraId(null);
    setResultImage(null);
    setEditPrompt('');
    setState('landing');
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `chronos-booth-${selectedEraId || 'edit'}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!resultImage) return;

    try {
      // Convert base64 to blob/file for sharing
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const file = new File([blob], 'chronos-manifestation.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Chronos Booth Manifestation',
          text: `Check out my portrait from ${ERAS.find(e => e.id === selectedEraId)?.name || 'another era'}!`,
        });
      } else {
        // Fallback: Copy data URL or just alert
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard! (Image sharing not supported in this browser)");
      }
    } catch (err) {
      console.error("Share failed:", err);
      alert("Sharing failed. You can still download the image.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Immersive Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <main className={cn(
        "relative z-10 mx-auto px-6 py-12 transition-all duration-500",
        state === 'capture' ? "max-w-7xl" : "max-w-5xl"
      )}>
        <AnimatePresence mode="wait">
          {state === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              className="flex flex-col items-center text-center space-y-12 py-20"
            >
              <div className="space-y-4">
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest"
                >
                  <History className="w-3 h-3" />
                  <span>Temporal Imaging System v2.5</span>
                </motion.div>
                <motion.h1 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ 
                    skewX: [0, -2, 2, 0],
                    transition: { duration: 0.2, repeat: Infinity }
                  }}
                  transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                  className="text-6xl md:text-8xl font-bold tracking-tighter text-white cursor-default"
                >
                  CHRONOS <br />
                  <span className="text-emerald-500 italic">BOOTH</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-zinc-400 max-w-lg mx-auto text-lg"
                >
                  Step into the stream of time. Capture your likeness and manifest in any era of human history.
                </motion.p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl"
              >
                {[
                  { icon: CameraIcon, title: "Capture", desc: "Take a high-res portrait" },
                  { icon: Clock, title: "Select Era", desc: "Choose your destination" },
                  { icon: Sparkles, title: "Manifest", desc: "AI weaves you into history" }
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.08)' }}
                    className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left space-y-3 transition-colors"
                  >
                    <item.icon className="w-6 h-6 text-emerald-500" />
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="text-sm text-zinc-500">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, type: "spring" }}
                  onClick={() => setState('capture')}
                  className="group relative px-12 py-5 bg-emerald-500 text-black font-bold text-xl rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center space-x-3">
                    <span>BEGIN JOURNEY</span>
                    <ChevronRight className="w-6 h-6" />
                  </span>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1, type: "spring" }}
                  onClick={() => setState('gallery')}
                  className="px-8 py-5 bg-white/5 border border-white/10 text-white font-semibold text-lg rounded-full hover:bg-white/10 transition-all flex items-center space-x-2"
                >
                  <ImageIcon className="w-5 h-5 text-emerald-500" />
                  <span>VIEW GALLERY</span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {state === 'gallery' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <button onClick={() => setState('landing')} className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                <h2 className="text-4xl font-bold text-white tracking-tight">Temporal Gallery</h2>
                <div className="w-20" />
              </div>

              {savedPhotos.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p className="text-zinc-500">Your gallery is currently empty. Capture some portraits to begin.</p>
                  <button 
                    onClick={() => setState('capture')}
                    className="text-emerald-500 hover:underline font-medium"
                  >
                    Start capturing
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedPhotos.map((photoItem) => (
                    <motion.div 
                      key={photoItem.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900"
                    >
                      <img src={photoItem.data} alt="Saved" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-zinc-400">
                            <div className="font-semibold text-white">Captured</div>
                            <div>{photoItem.date}</div>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={async () => {
                                setPhoto(photoItem.data);
                                setState('era-select');
                                setIsProcessing(true);
                                try {
                                  const result = await analyzeImage(photoItem.data);
                                  setAnalysis(result);
                                } catch (err) {
                                  console.error(err);
                                  setAnalysis('Analysis unavailable for this saved portrait. You can still generate an era transformation.');
                                } finally {
                                  setIsProcessing(false);
                                }
                              }}
                              className="p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors"
                              title="Use this portrait"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deletePhoto(photoItem.id)}
                              className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors border border-red-500/30"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {state === 'capture' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <button onClick={reset} className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                <h2 className="text-4xl font-bold text-white tracking-tight">Capture Portrait</h2>
                <div className="w-20" />
              </div>
              <Camera onCapture={handleCapture} />
              <div className="text-center text-zinc-500 text-lg max-w-2xl mx-auto">
                Ensure your face is well-lit and centered for the best temporal alignment.
              </div>
            </motion.div>
          )}

          {state === 'era-select' && (
            <motion.div
              key="era-select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold text-white tracking-tight">Select Destination</h2>
                  <p className="text-zinc-400">Where in history shall we manifest you?</p>
                </div>
                {photo && (
                  <div className="flex items-center space-x-6">
                    <button 
                      onClick={() => savePhoto(photo)}
                      className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-all text-sm"
                    >
                      <Save className="w-4 h-4 text-emerald-500" />
                      <span>Save Original</span>
                    </button>
                    <div className="flex items-center space-x-4 p-3 rounded-2xl bg-white/5 border border-white/10">
                      <img src={photo} alt="Source" className="w-12 h-12 rounded-lg object-cover" />
                      <div className="text-xs">
                        <div className="text-emerald-400 font-semibold uppercase tracking-wider">Subject Locked</div>
                        <div className="text-zinc-500">Temporal signature captured</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <EraSelector 
                    selectedEraId={selectedEraId} 
                    onSelect={setSelectedEraId} 
                  />
                  
                  <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <Wand2 className="w-5 h-5" />
                      <h3 className="font-semibold">Custom Temporal Modification</h3>
                    </div>
                    <p className="text-sm text-zinc-400">Or describe a specific scene or filter you'd like to apply.</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="e.g., 'Add a 1970s polaroid filter' or 'Make me a space explorer'"
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                      <button 
                        onClick={handleManualEdit}
                        disabled={!editPrompt || isProcessing}
                        className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center space-x-2 text-white">
                      <Info className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-semibold">Subject Analysis</h3>
                    </div>
                    {isProcessing ? (
                      <div className="flex items-center space-x-3 text-zinc-500 py-8">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm animate-pulse">Analyzing temporal signature...</span>
                      </div>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed">
                        <Markdown>{analysis || "Analysis pending..."}</Markdown>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!selectedEraId || isProcessing}
                    className="w-full py-4 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>MANIFEST IN TIME</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex flex-col items-center justify-center py-32 space-y-8 overflow-hidden rounded-3xl"
            >
              {/* Scanline Effect */}
              <motion.div 
                initial={{ top: "-100%" }}
                animate={{ top: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-emerald-500/50 blur-sm z-20"
              />
              <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
              
              <div className="relative z-10">
                <div className="w-32 h-32 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity }
                    }}
                  >
                    <Clock className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                </div>
              </div>
              <div className="relative z-10 text-center space-y-2">
                <motion.h2 
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-3xl font-bold text-white tracking-tight"
                >
                  Weaving Reality...
                </motion.h2>
                <p className="text-zinc-500">Integrating your likeness into the temporal fabric of {ERAS.find(e => e.id === selectedEraId)?.name || 'the past'}.</p>
              </div>
              <div className="relative z-10 flex flex-col items-center space-y-2 text-xs text-zinc-600 uppercase tracking-[0.2em]">
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.2 }}
                >
                  Quantum coherence: 98.4%
                </motion.span>
                <span>Temporal drift: 0.002s</span>
              </div>
            </motion.div>
          )}

          {state === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button onClick={() => setState('era-select')} className="flex items-center space-x-2 text-zinc-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Eras</span>
                </button>
                <h2 className="text-2xl font-bold text-white tracking-tight">Temporal Manifestation</h2>
                <button onClick={reset} className="text-emerald-500 hover:text-emerald-400 font-semibold">
                  New Journey
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, rotateY: 45 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative aspect-square md:aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 perspective-1000"
                  >
                    {resultImage ? (
                      <motion.img 
                        initial={{ filter: 'brightness(2) blur(20px)' }}
                        animate={{ filter: 'brightness(1) blur(0px)' }}
                        transition={{ duration: 1.2 }}
                        src={resultImage} 
                        alt="Result" 
                        className="w-full h-full object-contain" 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-500">
                        Failed to load image.
                      </div>
                    )}
                    <div className="absolute bottom-6 right-6 flex space-x-3">
                      <button 
                        onClick={downloadResult}
                        className="p-4 bg-white text-black rounded-full shadow-xl hover:bg-zinc-200 transition-colors"
                      >
                        <Download className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={handleShare}
                        className="p-4 bg-zinc-900/80 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-zinc-800 transition-colors"
                      >
                        <Share2 className="w-6 h-6" />
                      </button>
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="font-semibold text-white flex items-center space-x-2">
                      <Info className="w-4 h-4 text-emerald-500" />
                      <span>Manifestation Details</span>
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Destination</span>
                        <span className="text-zinc-300">{ERAS.find(e => e.id === selectedEraId)?.name || 'Custom'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Fidelity</span>
                        <span className="text-emerald-500">High</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Status</span>
                        <span className="text-emerald-500">Stable</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                    <h3 className="font-semibold text-emerald-400 flex items-center space-x-2">
                      <Wand2 className="w-4 h-4" />
                      <span>Refine Manifestation</span>
                    </h3>
                    <textarea 
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Add more detail... e.g., 'Make it sepia' or 'Add a vintage hat'"
                      className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                    />
                    <button 
                      onClick={handleManualEdit}
                      disabled={!editPrompt || isProcessing}
                      className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>Apply Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/5 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-zinc-600 text-xs uppercase tracking-[0.3em]">
            <History className="w-3 h-3" />
            <span>Chronos Booth Temporal Imaging</span>
          </div>
          <button
            onClick={async () => {
              try {
                // @ts-ignore
                if (window.aistudio && window.aistudio.openSelectKey) {
                  // @ts-ignore
                  await window.aistudio.openSelectKey();
                  // Force a reload or state update if needed, though the key is usually injected immediately
                  alert("API Key updated successfully.");
                } else {
                  alert("API Key selection is not available in this environment.");
                }
              } catch (e) {
                console.error("Failed to open key selector", e);
              }
            }}
            className="text-zinc-700 hover:text-emerald-500 text-xs transition-colors flex items-center space-x-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>Configure Neural Link</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
