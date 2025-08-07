import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{
    src: string;
    alt: string;
    fileName?: string;
    filePath?: string;
  }>;
  initialIndex?: number;
}

export default function ImagePreviewModal({ isOpen, onClose, images, initialIndex = 0 }: ImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [initialIndex, isOpen]);

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsLoading(true);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsLoading(true);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.5, 0.5);
    setZoom(newZoom);
    if (newZoom === 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Touch and pan handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      // Pinch zoom logic could be added here
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning && zoom > 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastTouch.x;
      const deltaY = e.touches[0].clientY - lastTouch.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const handleDownload = async () => {
    if (!currentImage.filePath || !currentImage.fileName) return;
    
    try {
      const response = await fetch(`/api/files/${currentImage.filePath}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentImage.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        handlePrevious();
        break;
      case 'ArrowRight':
        handleNext();
        break;
      case '+':
      case '=':
        handleZoomIn();
        break;
      case '-':
        handleZoomOut();
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen bg-black/95 border-0 p-0 overflow-hidden sm:max-w-[95vw] sm:max-h-[95vh] sm:w-full sm:h-full">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        
        {/* Header with controls */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-2 sm:p-4 safe-top">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium truncate max-w-md">
                {currentImage.fileName || currentImage.alt}
              </h3>
              {images.length > 1 && (
                <span className="text-sm bg-black/50 px-2 py-1 rounded">
                  {currentIndex + 1} / {images.length}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="text-white hover:bg-white/20 h-8 w-8 p-1 sm:h-auto sm:w-auto sm:p-2 hidden sm:flex"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <span className="text-xs sm:text-sm bg-black/50 px-1 py-0.5 sm:px-2 sm:py-1 rounded min-w-[50px] sm:min-w-[60px] text-center hidden sm:block">
                {Math.round(zoom * 100)}%
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="text-white hover:bg-white/20 h-8 w-8 p-1 sm:h-auto sm:w-auto sm:p-2 hidden sm:flex"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-white hover:bg-white/20 h-10 w-10 p-2 sm:h-auto sm:w-auto"
                title="İndir"
              >
                <Download className="w-4 h-4 sm:w-4 sm:h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-10 w-10 p-2 sm:h-auto sm:w-auto"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main image display */}
        <div className="flex items-center justify-center w-full h-full relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          
          <img
            ref={imageRef}
            src={currentImage.src}
            alt={currentImage.alt}
            className="max-w-none object-contain transition-transform duration-200 ease-in-out select-none cursor-move"
            style={{
              transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
              maxHeight: zoom === 1 ? 'calc(100vh - 120px)' : 'none',
              maxWidth: zoom === 1 ? 'calc(100vw - 40px)' : 'none',
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
            draggable={false}
          />
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 w-12 h-12 p-0 rounded-full"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 w-12 h-12 p-0 rounded-full"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Bottom hint */}
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="text-center text-white/70 text-sm">
            <span className="hidden sm:block">Klavye: ← → gezinme, +/- yakınlaştırma, ESC çıkış</span>
            <span className="sm:hidden">Çift dokun: yakınlaştır • Sürükle: kaydır • Yan kaydır: sonraki</span>
          </div>
          {/* Mobile zoom indicator */}
          <div className="sm:hidden text-center text-white/70 text-xs mt-1">
            {Math.round(zoom * 100)}% yakınlaştırma
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}