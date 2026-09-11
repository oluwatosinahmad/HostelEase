import React, { useEffect, useState } from 'react';
import { ShieldCheck, Building2 } from 'lucide-react';

interface HostelEaseBrandedLoaderProps {
  isReady: boolean;
  onFinish?: () => void;
}

export const HostelEaseBrandedLoader: React.FC<HostelEaseBrandedLoaderProps> = ({
  isReady,
  onFinish
}) => {
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [statusIndex, setStatusIndex] = useState<number>(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState<boolean>(false);

  const statusMessages = [
    'Connecting LAUTECH verified accommodation network...',
    'Locating verified hostels in Under-G, Adenike & Stadium...',
    'Synchronizing real-time bedspace availability & rates...',
    'Securing student housing with 100% safety escrow...'
  ];

  // Rotate status messages smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex(prev => (prev + 1) % statusMessages.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [statusMessages.length]);

  // Ensure a tiny minimum visible window (650ms) so fast connections don't flash violently,
  // but never cause an annoying delay.
  useEffect(() => {
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 650);

    // Hard fallback timeout (3.5s max) to guarantee platform accessibility even if offline
    const maxTimer = setTimeout(() => {
      setMinTimeElapsed(true);
      setIsFadingOut(true);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 400);
    }, 3500);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [onFinish]);

  // When both the app is ready and minimum smooth display time has passed, trigger fade-out
  useEffect(() => {
    if (isReady && minTimeElapsed && !isFadingOut) {
      setIsFadingOut(true);
      const exitTimer = setTimeout(() => {
        if (onFinish) onFinish();
      }, 450);
      return () => clearTimeout(exitTimer);
    }
  }, [isReady, minTimeElapsed, isFadingOut, onFinish]);

  return (
    <div
      role="status"
      aria-label="Loading Hostel Ease platform"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 select-none overflow-hidden transition-all duration-400 ease-out ${
        isFadingOut
          ? 'opacity-0 scale-[1.02] pointer-events-none'
          : 'opacity-100 scale-100 pointer-events-auto'
      } bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white`}
    >
      {/* Background Radial Glow & Ambient Aura */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] rounded-full bg-radial from-emerald-500/15 via-teal-500/5 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* 3D Modern Student Hostel Building Scene */}
      <div className="relative flex flex-col items-center justify-center mb-6">
        
        {/* 3D Perspective Canvas Container */}
        <div 
          className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center"
          style={{ perspective: '900px' }}
        >
          {/* Subtle 3D Floating Building */}
          <div 
            className="w-28 h-28 sm:w-32 sm:h-32 relative transition-transform duration-700 ease-in-out motion-safe:animate-float3d"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateX(14deg) rotateY(-18deg) rotateZ(2deg)'
            }}
          >
            {/* SVG 3D Isometric Hostel Building */}
            <svg
              viewBox="0 0 160 160"
              className="w-full h-full drop-shadow-[0_15px_25px_rgba(16,185,129,0.25)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Facade & Roof Gradients */}
                <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>

                <linearGradient id="frontFacadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                <linearGradient id="sideFacadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>

                <linearGradient id="windowGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>

                <linearGradient id="glassDoorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              {/* 3D Base Foundation Slab */}
              <polygon points="80,145 140,115 80,85 20,115" fill="#020617" opacity="0.6" />

              {/* Left Side Facade (Shadowed Depth) */}
              <polygon points="25,108 80,136 80,68 25,40" fill="url(#sideFacadeGrad)" stroke="#334155" strokeWidth="1.2" />

              {/* Right Front Facade (Illuminated) */}
              <polygon points="80,136 135,108 135,40 80,68" fill="url(#frontFacadeGrad)" stroke="#334155" strokeWidth="1.2" />

              {/* 3D Slanted Roof Canopy (Emerald Eco-Roof) */}
              <polygon points="80,15 142,42 80,70 18,42" fill="url(#roofGrad)" stroke="#34d399" strokeWidth="1.5" />
              
              {/* Roof Ridge Architectural Line */}
              <line x1="80" y1="15" x2="80" y2="70" stroke="#6ee7b7" strokeWidth="1.5" strokeDasharray="3 2" />

              {/* Left Side Windows (Subtle Room Glow) */}
              <g className="opacity-80">
                {/* Room 101 */}
                <polygon points="36,65 52,73 52,87 36,79" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                <polygon points="38,67 50,73 50,85 38,79" fill="#0284c7" opacity="0.6" />
                {/* Room 201 */}
                <polygon points="58,76 74,84 74,98 58,90" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                <polygon points="60,78 72,84 72,96 60,90" fill="#0284c7" opacity="0.6" />
              </g>

              {/* Right Front Student Windows (Glowing Active Accommodations) */}
              <g>
                {/* Room 102 - Sequentially Glowing */}
                <polygon points="88,84 104,76 104,90 88,98" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                <polygon 
                  points="90,85 102,78 102,89 90,96" 
                  fill="url(#windowGlow)"
                  className="motion-safe:animate-pulse"
                />

                {/* Room 202 - Verified Emerald Light */}
                <polygon points="110,73 126,65 126,79 110,87" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                <polygon 
                  points="112,74 124,67 124,78 112,85" 
                  fill="#10b981"
                  className="motion-safe:animate-pulse"
                  style={{ animationDelay: '300ms' }}
                />

                {/* Upper Penthouse Room */}
                <polygon points="99,62 115,54 115,66 99,74" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                <polygon 
                  points="101,63 113,56 113,65 101,72" 
                  fill="url(#windowGlow)"
                  className="motion-safe:animate-pulse"
                  style={{ animationDelay: '600ms' }}
                />
              </g>

              {/* Ground Floor Entrance Glass Doorway */}
              <polygon points="98,118 116,109 116,128 98,137" fill="url(#glassDoorGrad)" stroke="#6ee7b7" strokeWidth="1" />
              
              {/* Glass Door Highlight */}
              <line x1="102" y1="120" x2="102" y2="134" stroke="#d1fae5" strokeWidth="1" opacity="0.8" />

              {/* Hostel Ease Verification Badge Floating on Peak */}
              <circle cx="80" cy="15" r="5" fill="#10b981" />
              <circle cx="80" cy="15" r="8" stroke="#34d399" strokeWidth="1" opacity="0.6" className="motion-safe:animate-ping" />
            </svg>
          </div>
        </div>

        {/* 3D Ground Elevation Pulsing Shadow */}
        <div 
          className="w-28 sm:w-36 h-3.5 bg-emerald-500/20 rounded-full blur-md -mt-2 motion-safe:animate-shadowPulse"
          aria-hidden="true"
        />
      </div>

      {/* Hostel Ease Brand Mark & Identity */}
      <div className="flex flex-col items-center text-center space-y-2 max-w-sm px-4">
        
        {/* Brand Name with Metallic Emerald Finish */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-emerald-400/40">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center">
            HOSTEL<span className="text-emerald-400 ml-0.5">EASE</span>
          </h1>
        </div>

        {/* Slogan */}
        <p className="text-xs sm:text-sm font-semibold text-slate-300">
          Smart Student Living <span className="text-emerald-400 mx-1">•</span> LAUTECH, Ogbomoso
        </p>

        {/* Dynamic Progress Indicator Pill */}
        <div className="w-48 sm:w-56 h-1.5 bg-slate-800/80 rounded-full overflow-hidden mt-3 relative border border-slate-700/50">
          <div 
            className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full motion-safe:animate-indeterminate"
            style={{ width: '45%' }}
          />
        </div>

        {/* Contextual Status Stream */}
        <div className="h-6 flex items-center justify-center mt-2">
          <p className="text-[11px] sm:text-xs text-slate-400 font-medium animate-fadeIn transition-opacity duration-300 text-center truncate">
            {statusMessages[statusIndex]}
          </p>
        </div>

        {/* Security & Verification Pill */}
        <div className="pt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400/90 tracking-wide uppercase">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Verified Lodges & Escrow Protected</span>
        </div>
      </div>

      {/* Global CSS Keyframes for the 3D Animation */}
      <style>{`
        @keyframes float3d {
          0%, 100% {
            transform: rotateX(14deg) rotateY(-18deg) rotateZ(2deg) translateY(0px);
          }
          50% {
            transform: rotateX(11deg) rotateY(-14deg) rotateZ(1deg) translateY(-8px);
          }
        }

        @keyframes shadowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.25;
          }
          50% {
            transform: scale(0.82);
            opacity: 0.12;
          }
        }

        @keyframes indeterminate {
          0% {
            left: -45%;
          }
          100% {
            left: 100%;
          }
        }

        .animate-float3d {
          animation: float3d 3.6s ease-in-out infinite;
        }

        .animate-shadowPulse {
          animation: shadowPulse 3.6s ease-in-out infinite;
        }

        .animate-indeterminate {
          animation: indeterminate 1.4s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-float3d,
          .animate-shadowPulse,
          .animate-indeterminate {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
export default HostelEaseBrandedLoader;
