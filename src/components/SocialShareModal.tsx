import React, { useState } from 'react';
import { 
  Share2, 
  X, 
  Copy, 
  Check, 
  MessageCircle, 
  Twitter, 
  Facebook, 
  Send,
  Building2,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { Property } from '../types';
import { formatNaira } from '../utils/formatters';

interface SocialShareModalProps {
  isOpen: boolean;
  property: Property | null;
  onClose: () => void;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  property,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !property) return null;

  const shareUrl = `${window.location.origin}/?property=${property.id}`;
  const shareTitle = `Verified Accommodation: ${property.title} in ${property.zoneName}, Ogbomoso (${formatNaira(property.fees.annualRent)}/yr)`;
  const shareMessage = `🏠 Looking for accommodation around LAUTECH? Check out this verified student hostel "${property.title}" in ${property.zoneName}, Ogbomoso (${formatNaira(property.fees.annualRent)}/yr) on CampusNest! Verified borehole, prepaid meter & 48h escrow protection.\n\n${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleTwitterShare = () => {
    const encoded = encodeURIComponent(`Check out "${property.title}" around LAUTECH (${property.zoneName}) on CampusNest!`);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleTelegramShare = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden text-white my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600/20 text-brand-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-brand-400 uppercase tracking-wider block">Share with Roommates & Friends</span>
              <h3 className="font-bold text-white text-base">Share Property</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Property Card Snapshot */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
            <img src={property.coverImage} alt={property.title} className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0" />
            <div className="min-w-0">
              <h4 className="font-bold text-white truncate text-xs">{property.title}</h4>
              <p className="text-slate-400 text-[11px]">{property.zoneName} • {property.propertyTypeLabel}</p>
              <div className="text-emerald-400 font-bold font-mono text-xs">{formatNaira(property.fees.annualRent)} <span className="text-[10px] text-slate-400">/ yr</span></div>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className="p-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-2xl flex items-center justify-center gap-2 text-emerald-300 font-bold transition-all cursor-pointer shadow-sm"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Share to WhatsApp</span>
            </button>

            {/* X / Twitter */}
            <button
              onClick={handleTwitterShare}
              className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-slate-200 font-bold transition-all cursor-pointer"
            >
              <Twitter className="w-4 h-4 text-sky-400" />
              <span>Post to X (Twitter)</span>
            </button>

            {/* Telegram */}
            <button
              onClick={handleTelegramShare}
              className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-slate-200 font-bold transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 text-blue-400" />
              <span>Telegram Group</span>
            </button>

            {/* Facebook */}
            <button
              onClick={handleFacebookShare}
              className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-slate-200 font-bold transition-all cursor-pointer"
            >
              <Facebook className="w-4 h-4 text-blue-500" />
              <span>Facebook</span>
            </button>
          </div>

          {/* Direct Copy Link */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Direct Listing Link
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-1.5 pl-3">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="bg-transparent text-slate-300 font-mono text-[11px] w-full focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand-600 hover:bg-brand-500 text-white shadow-md'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 text-center text-[11px] text-slate-400">
          <span>CampusNest verified link • Zero spam guarantee</span>
        </div>

      </div>
    </div>
  );
};
