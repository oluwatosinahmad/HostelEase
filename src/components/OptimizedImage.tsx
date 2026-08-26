import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  thumbnail?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  aspectRatio = 'aspect-[16/10]',
  thumbnail = false,
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Format Unsplash images with optimal sizing and compression
  const getOptimizedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('images.unsplash.com')) {
      const baseUrl = url.split('?')[0];
      const width = thumbnail ? 400 : 800;
      const quality = thumbnail ? 65 : 75;
      return `${baseUrl}?auto=format&fit=crop&w=${width}&q=${quality}`;
    }
    return url;
  };

  const optimizedSrc = getOptimizedUrl(src);

  if (error || !src) {
    return (
      <div className={`w-full ${aspectRatio} bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 p-4 text-center ${className}`}>
        <Building2 className="w-8 h-8 mb-1.5 text-slate-400 dark:text-slate-500" />
        <span className="text-[10px] font-bold">Hostel Ease Photo</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${aspectRatio} overflow-hidden bg-slate-200 dark:bg-slate-800 ${className}`}>
      {/* Shimmer placeholder before load */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-pulse" />
      )}
      
      <img
        src={optimizedSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
};
