import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';

interface HostelImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: { id: string; url: string; caption?: string }[];
  hostelTitle: string;
  initialIndex?: number;
}

export const HostelImageGalleryModal: React.FC<HostelImageGalleryModalProps> = ({
  isOpen,
  onClose,
  images = [],
  hostelTitle,
  initialIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || images.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between animate-in fade-in duration-200">
      {/* Gallery Header */}
      <div className="p-4 flex items-center justify-between text-white border-b border-white/10">
        <div>
          <h3 className="text-sm font-bold truncate max-w-xs sm:max-w-md">{hostelTitle}</h3>
          <p className="text-xs text-white/60">
            Photo {currentIndex + 1} of {images.length}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Close photo gallery"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-transform active:scale-95"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-transform active:scale-95"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Current Image */}
        <div className="max-w-4xl max-h-[70vh] w-full h-full flex items-center justify-center">
          <img
            key={currentImage?.id || currentIndex}
            src={currentImage?.url}
            alt={currentImage?.caption || `${hostelTitle} photo ${currentIndex + 1}`}
            className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
          />
        </div>
      </div>

      {/* Gallery Caption & Thumbnail Strip */}
      <div className="p-4 bg-black/80 border-t border-white/10 space-y-3">
        {currentImage?.caption && (
          <p className="text-xs text-center text-white/80 font-medium">{currentImage.caption}</p>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 px-2 scrollbar-none">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                  idx === currentIndex
                    ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/30'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
