import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, Move } from 'lucide-react';

const ImageViewer = ({ images, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const currentImage = images[currentIndex];

  useEffect(() => {
    // Reset state when image changes
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length]);

  const handleZoom = (delta, clientX, clientY) => {
    setScale((prevScale) => {
      let newScale = prevScale - delta * 0.005;
      if (newScale < 0.5) newScale = 0.5;
      if (newScale > 5) newScale = 5;
      
      // If we're scaling down to 1, reset position to center
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    handleZoom(e.deltaY, e.clientX, e.clientY);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    if (scale <= 1) return; // Only drag if zoomed in
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
         onClick={onClose}>
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent z-10" onClick={e => e.stopPropagation()}>
        <div className="text-white">
          <p className="font-semibold text-lg">{currentImage.caption || currentImage.filename}</p>
          <p className="text-xs text-gray-300">
            {currentIndex + 1} of {images.length} • {currentImage.category.toUpperCase()}
          </p>
        </div>
        
        <div className="flex gap-4">
          <button onClick={() => setScale(s => Math.min(5, s + 0.5))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Zoom In">
            <ZoomIn size={20} />
          </button>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.5))} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Zoom Out">
            <ZoomOut size={20} />
          </button>
          <button onClick={() => setRotation(r => r + 90)} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Rotate">
            <RotateCw size={20} />
          </button>
          <button onClick={onClose} className="p-2 text-white hover:bg-red-500/80 rounded-full transition-colors ml-4" title="Close">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/20 rounded-full transition-colors z-10">
          <ChevronLeft size={36} />
        </button>
      )}
      
      {currentIndex < images.length - 1 && (
        <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/20 rounded-full transition-colors z-10">
          <ChevronRight size={36} />
        </button>
      )}

      {/* Image Container */}
      <div 
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={e => e.stopPropagation()}
      >
        <img 
          src={currentImage.file_url} 
          alt={currentImage.filename}
          className="max-w-[90vw] max-h-[90vh] object-contain transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
          draggable={false}
        />
        
        {/* Helper overlay when zooming */}
        {scale > 1 && (
          <div className="absolute bottom-6 right-6 bg-black/60 px-3 py-1.5 rounded-full text-white text-xs font-semibold flex items-center gap-2 pointer-events-none">
            <Move size={14} /> Drag to pan ({Math.round(scale * 100)}%)
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageViewer;
