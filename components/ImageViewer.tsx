// components/ImageViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Download, Maximize2, Minimize2, RotateCw, Package, MapPin, User, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageViewerProps {
  image: {
    url: string;
    nombre: string;
    codigo?: string;
    categoria?: string;
    ubicacion?: string;
    responsable?: string;
    estado?: string;
    stock?: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageViewer({ image, isOpen, onClose }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setImageLoaded(false);
    setImageError(false);
  }, [image?.url]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-' || e.key === '_') zoomOut();
      if (e.key === 'r') rotateImage();
      if (e.key === 'i') setShowInfo(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const zoomIn = () => {
    setZoom(Math.min(zoom + 0.25, 3));
  };

  const zoomOut = () => {
    setZoom(Math.max(zoom - 0.25, 0.5));
  };

  const rotateImage = () => {
    setRotation((rotation + 90) % 360);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const downloadImage = async () => {
    if (!image?.url || imageError) return;
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.nombre || 'imagen'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando imagen:', error);
    }
  };

  // Validar que la imagen existe y tiene URL válida
  if (!isOpen || !image || !image.url || image.url.trim() === '') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-center justify-center"
        onClick={onClose}
      >
        <div 
          className="relative w-full h-full flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con controles */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              {/* Info del ítem - compacta y elegante */}
              {showInfo && (
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-[#FFD700]" />
                      <span className="text-white text-sm font-medium">{image.nombre}</span>
                    </div>
                    {image.codigo && (
                      <div className="flex items-center gap-2">
                        <Hash size={12} className="text-white/40" />
                        <span className="text-white/60 text-xs font-mono">{image.codigo}</span>
                      </div>
                    )}
                    {image.categoria && (
                      <span className="text-white/50 text-[10px] px-2 py-0.5 bg-white/10 rounded-full">
                        {image.categoria}
                      </span>
                    )}
                    {image.estado && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        image.estado === 'Bueno' ? 'bg-green-500/20 text-green-300' :
                        image.estado === 'Regular' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {image.estado}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  title="Mostrar/Ocultar información (i)"
                >
                  <span className="text-white text-xs font-bold w-4 h-4 flex items-center justify-center">i</span>
                </button>
                <button
                  onClick={zoomOut}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  title="Alejar (-)"
                >
                  <ZoomOut size={20} className="text-white" />
                </button>
                <button
                  onClick={zoomIn}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  title="Acercar (+)"
                >
                  <ZoomIn size={20} className="text-white" />
                </button>
                <button
                  onClick={rotateImage}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  title="Rotar (R)"
                >
                  <RotateCw size={20} className="text-white" />
                </button>
                <button
                  onClick={downloadImage}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  title="Descargar"
                >
                  <Download size={20} className="text-white" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all hidden md:block"
                  title="Pantalla completa"
                >
                  {isFullscreen ? <Minimize2 size={20} className="text-white" /> : <Maximize2 size={20} className="text-white" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  title="Cerrar (ESC)"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Imagen principal */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div className="relative max-w-[90vw] max-h-[85vh]">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-[#FFD700] rounded-full animate-spin"></div>
                </div>
              )}
              {imageError ? (
                <div className="flex flex-col items-center justify-center text-white/50 gap-4">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
                    <Package size={48} className="text-white/30" />
                  </div>
                  <p className="text-sm">No se pudo cargar la imagen</p>
                  <p className="text-xs text-white/30">El archivo puede haber sido movido o eliminado</p>
                </div>
              ) : (
                <motion.img
                  src={image.url}
                  alt={image.nombre}
                  className="max-w-full max-h-[85vh] object-contain cursor-grab active:cursor-grabbing"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                    opacity: imageLoaded ? 1 : 0
                  }}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  drag
                  dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
                  dragElastic={0.1}
                />
              )}
            </div>
          </div>

          {/* Footer con información adicional */}
          {showInfo && !imageError && (
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4">
              <div className="max-w-7xl mx-auto">
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
                    {image.ubicacion && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-[#FFD700]/70" />
                        <span className="text-white/70">{image.ubicacion}</span>
                      </div>
                    )}
                    {image.responsable && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-[#FFD700]/70" />
                        <span className="text-white/70">{image.responsable}</span>
                      </div>
                    )}
                    {image.stock !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <Package size={12} className="text-[#FFD700]/70" />
                        <span className="text-white/70">Stock: {image.stock}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instrucciones táctiles */}
          {!imageError && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 md:hidden text-white/20 text-[10px] text-center whitespace-nowrap">
              <p>Pincha para zoom | Presiona 'i' para info</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}