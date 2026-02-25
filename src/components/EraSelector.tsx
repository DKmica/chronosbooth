import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ERAS } from '../services/gemini';
import { Clock, Info } from 'lucide-react';

interface EraSelectorProps {
  selectedEraId: string | null;
  onSelect: (eraId: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20
    }
  }
};

export const EraSelector: React.FC<EraSelectorProps> = ({ selectedEraId, onSelect }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 md:grid-cols-3 gap-4"
    >
      {ERAS.map((era) => (
        <div key={era.id} className="relative">
          <AnimatePresence>
            {hoveredId === era.id && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="absolute bottom-full mb-3 left-0 right-0 z-50 pointer-events-none"
              >
                <div className="bg-zinc-900/95 backdrop-blur-md border border-emerald-500/30 p-3 rounded-xl shadow-2xl shadow-black/50">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {era.description}
                    </p>
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 border-r border-b border-emerald-500/30 rotate-45" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            variants={itemVariants}
            whileHover={{ 
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setHoveredId(era.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelect(era.id)}
            className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all group ${
              selectedEraId === era.id 
                ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            <img 
              src={era.image} 
              alt={era.name} 
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Historical Era</span>
              </div>
              <h3 className="text-white font-medium text-sm md:text-base">{era.name}</h3>
            </div>
            
            {selectedEraId === era.id && (
              <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
                <Clock className="w-3 h-3" />
              </div>
            )}
          </motion.button>
        </div>
      ))}
    </motion.div>
  );
};
