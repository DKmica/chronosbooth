import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, RefreshCw, Check, X, AlertCircle, FlipHorizontal, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraProps {
  onCapture: (base64Image: string) => void;
}

export const Camera: React.FC<CameraProps> = ({ onCapture }) => {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
  }, [stream]);

  const startCamera = async () => {
    if (isStarting) return;
    
    setIsStarting(true);
    setError(null);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser/environment.");
      }

      // Stop any existing stream before starting a new one
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          // Relaxed constraints for better compatibility
          width: { min: 640, ideal: 1920 },
          height: { min: 480, ideal: 1080 }
        } 
      });
      
      setStream(mediaStream);
      
      // If the video element is already in the DOM, attach the stream immediately
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = mediaStream;
        await videoElementRef.current.play().catch(e => console.error("Play error:", e));
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      let msg = "Could not access camera.";
      if (err.name === 'NotAllowedError') msg = "Camera permission denied.";
      else if (err.name === 'NotFoundError') msg = "No camera found on this device.";
      else if (err.message) msg = err.message;
      
      setError(msg);
    } finally {
      setIsStarting(false);
    }
  };

  // Callback ref to handle video element mounting/unmounting
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoElementRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
      node.play().catch(e => console.error("Callback ref play error:", e));
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
  }, [facingMode]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capture = useCallback(() => {
    if (videoElementRef.current && canvasRef.current) {
      const video = videoElementRef.current;
      const canvas = canvasRef.current;
      
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontally if using front camera
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  }, [stopCamera, facingMode]);

  const reset = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCapturedImage(base64String);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative w-full mx-auto aspect-[4/3] bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload}
      />
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center space-y-4 px-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-semibold">Temporal Sensor Error</h3>
              <p className="text-zinc-500 text-sm">{error}</p>
            </div>
            <button
              onClick={startCamera}
              className="px-6 py-2 bg-white text-black font-medium rounded-full hover:bg-zinc-200 transition-colors"
            >
              Retry Connection
            </button>
          </motion.div>
        ) : !stream && !capturedImage ? (
          <motion.div 
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <CameraIcon className="w-8 h-8 text-white/50 animate-pulse" />
            </div>
            <p className="text-zinc-500 text-sm">Initializing temporal sensor...</p>
          </motion.div>
        ) : capturedImage ? (
          <motion.div 
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            <div className="absolute bottom-10 left-0 right-0 flex justify-center space-x-8 px-6">
              <button
                onClick={reset}
                className="p-6 bg-zinc-900/80 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-zinc-800 transition-colors"
              >
                <RefreshCw className="w-8 h-8" />
              </button>
              <button
                onClick={confirm}
                className="p-6 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
              >
                <Check className="w-8 h-8" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center space-x-10 px-6">
              <button
                onClick={toggleCamera}
                className="p-5 bg-zinc-900/80 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-zinc-800 transition-colors"
                title="Switch Camera"
              >
                <FlipHorizontal className="w-8 h-8" />
              </button>
              
              <button
                onClick={capture}
                className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center group"
              >
                <div className="w-20 h-20 rounded-full bg-white group-hover:scale-90 transition-transform" />
              </button>

              <button
                onClick={triggerFileUpload}
                className="p-5 bg-zinc-900/80 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-zinc-800 transition-colors"
                title="Upload Image"
              >
                <Upload className="w-8 h-8" />
              </button>
              
              <button
                onClick={stopCamera}
                className="p-5 bg-zinc-900/80 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
