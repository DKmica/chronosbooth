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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const getDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  }, []);

  useEffect(() => {
    getDevices();
  }, [getDevices]);

  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoElementRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setFocusPoint({ x, y });
    
    // Clear focus point after animation
    setTimeout(() => setFocusPoint(null), 1000);
  };

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

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId } }
          : { facingMode: facingMode }
      };

      // Add resolution preferences
      if (typeof constraints.video === 'object') {
        (constraints.video as any).width = { min: 640, ideal: 1920 };
        (constraints.video as any).height = { min: 480, ideal: 1080 };
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      
      // Refresh devices list to get labels (now that we have permission)
      getDevices();
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

  useEffect(() => {
    const video = videoElementRef.current;
    if (video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch(err => {
          // Ignore AbortError as it's expected when stream changes rapidly
          if (err.name !== 'AbortError') {
            console.error("Video play error:", err);
          }
        });
      }
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
  }, [facingMode, selectedDeviceId]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const toggleCamera = () => {
    if (devices.length > 1) {
      // If we have multiple devices, cycle through them
      const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setSelectedDeviceId(devices[nextIndex].deviceId);
      
      // Update facingMode based on label if possible (heuristic)
      const label = devices[nextIndex].label.toLowerCase();
      if (label.includes('front') || label.includes('user')) {
        setFacingMode('user');
      } else if (label.includes('back') || label.includes('environment')) {
        setFacingMode('environment');
      }
    } else {
      // Fallback to simple toggle
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }
  };

  const capture = useCallback(async () => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    setFlashActive(true);
    
    // Wait for flash animation
    await new Promise(resolve => setTimeout(resolve, 150));
    setFlashActive(false);

    if (videoElementRef.current && canvasRef.current) {
      const video = videoElementRef.current;
      const canvas = canvasRef.current;
      
      // Optimize: Cap maximum dimension to 1280px to keep base64 strings manageable
      const MAX_DIMENSION = 1280;
      let width = video.videoWidth || 1280;
      let height = video.videoHeight || 720;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }
      
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
    setIsCapturing(false);
  }, [stopCamera, facingMode, isCapturing]);

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
            onClick={handleVideoClick}
          >
            <video
              ref={videoElementRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            
            {/* Focus Reticle */}
            <AnimatePresence>
              {focusPoint && (
                <motion.div
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute pointer-events-none w-16 h-16 border-2 border-white/50 rounded-lg"
                  style={{ 
                    left: focusPoint.x - 32, 
                    top: focusPoint.y - 32 
                  }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-2 bg-white" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-2 bg-white" />
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-1 bg-white" />
                  <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-1 bg-white" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Flash Overlay */}
            <AnimatePresence>
              {flashActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="absolute inset-0 bg-white z-50"
                />
              )}
            </AnimatePresence>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center space-x-10 px-6">
              <button
                onClick={toggleCamera}
                className="p-5 bg-zinc-900/80 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-zinc-800 transition-colors"
                title="Switch Camera"
                disabled={isCapturing}
              >
                <FlipHorizontal className="w-8 h-8" />
              </button>
              
              <button
                onClick={capture}
                disabled={isCapturing}
                className={`w-24 h-24 rounded-full border-4 border-white flex items-center justify-center group ${isCapturing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isCapturing ? (
                  <div className="w-8 h-8 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white group-hover:scale-90 transition-transform" />
                )}
              </button>

              <button
                onClick={triggerFileUpload}
                className="p-5 bg-zinc-900/80 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-zinc-800 transition-colors"
                title="Upload Image"
                disabled={isCapturing}
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
