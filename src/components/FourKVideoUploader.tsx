import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Upload,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Sparkles,
  Clock,
  ShieldCheck,
  Camera,
  Link as LinkIcon,
  X,
  FileVideo,
  Info
} from 'lucide-react';
import { api } from '../services/api';

export interface FourKVideoData {
  id?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  resolution?: string;
  fileSize?: number;
  duration?: number;
  caption?: string;
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'PENDING_AUDIT';
  rejectionReason?: string;
  uploadedAt?: string;
}

export interface FourKVideoUploaderProps {
  initialVideo?: FourKVideoData | null;
  onVideoChange: (video: FourKVideoData | null) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  propertyId?: string;
  propertyName?: string;
}

/**
 * Checks whether resolution matches 4K UHD standard.
 * Minimum 3840x2160 (horizontal UHD) or 2160x3840 (vertical 4K mobile walkthrough)
 * or 3840x1600 (ultrawide 4K) or 2160x2160.
 */
export function checkIs4KResolution(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  const w = Math.round(width);
  const h = Math.round(height);
  if (w >= 3840 && h >= 2160) return true;
  if (w >= 2160 && h >= 3840) return true;
  if (w >= 3840 && h >= 1600) return true;
  if (w >= 2160 && h >= 2160) return true;
  return false;
}

export const FourKVideoUploader: React.FC<FourKVideoUploaderProps> = ({
  initialVideo,
  onVideoChange,
  onShowToast,
  propertyId,
  propertyName
}) => {
  const [videoData, setVideoData] = useState<FourKVideoData | null>(initialVideo || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number; duration: number } | null>(
    initialVideo?.width && initialVideo?.height
      ? { width: initialVideo.width, height: initialVideo.height, duration: initialVideo.duration || 0 }
      : null
  );
  const [dimensionError, setDimensionError] = useState<string | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(initialVideo?.thumbnailUrl || null);
  const [caption, setCaption] = useState<string>(initialVideo?.caption || '');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (initialVideo) {
      setVideoData(initialVideo);
      if (initialVideo.thumbnailUrl) setPreviewThumbnail(initialVideo.thumbnailUrl);
      if (initialVideo.caption) setCaption(initialVideo.caption);
      if (initialVideo.width && initialVideo.height) {
        setVideoDimensions({
          width: initialVideo.width,
          height: initialVideo.height,
          duration: initialVideo.duration || 0
        });
      }
    } else if (initialVideo === null) {
      setVideoData(null);
      setPreviewThumbnail(null);
      setVideoDimensions(null);
      setCaption('');
    }
  }, [initialVideo]);

  // Handle local video file selection and metadata verification
  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 250 * 1024 * 1024) {
      onShowToast('Video file exceeds 250MB limit. Please choose a trimmed 4K walkthrough.', 'error');
      return;
    }

    setSelectedFile(file);
    setDimensionError(null);
    setVideoDimensions(null);
    setPreviewThumbnail(null);

    const blobUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = blobUrl;

    tempVideo.onloadedmetadata = () => {
      const w = tempVideo.videoWidth;
      const h = tempVideo.videoHeight;
      const dur = tempVideo.duration;

      setVideoDimensions({ width: w, height: h, duration: dur });

      const is4K = checkIs4KResolution(w, h);
      if (!is4K) {
        setDimensionError(
          `Detected resolution ${w}×${h} is below the 4K UHD standard (min 3840×2160 or 2160×3840 for vertical mobile tours). You may still upload, but high-tier 4K Verified badge requires 4K UHD.`
        );
      } else {
        setDimensionError(null);
      }

      tempVideo.currentTime = Math.min(1.5, Math.max(0.5, dur / 4));
    };

    tempVideo.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(640, tempVideo.videoWidth || 640);
        canvas.height = Math.min(360, tempVideo.videoHeight || 360);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const thumbUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPreviewThumbnail(thumbUrl);
        }
      } catch (err) {
        console.warn('Could not generate canvas thumbnail:', err);
      }
    };

    tempVideo.onerror = () => {
      setDimensionError('Could not read video metadata. Please select a valid MP4, WebM, or MOV file.');
    };
  };

  // Perform upload
  const handleUploadVideo = async () => {
    if (!selectedFile) {
      onShowToast('Please select a 4K video file first.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      const uploaded = await api.upload.chunkedVideo(
        selectedFile,
        (progress) => setUploadProgress(Math.max(5, Math.min(95, progress))),
        previewThumbnail || undefined
      );

      if (!uploaded || !uploaded.url) {
        throw new Error('Failed to upload video file to server.');
      }

      setUploadProgress(100);

      const w = videoDimensions?.width || 3840;
      const h = videoDimensions?.height || 2160;
      const is4K = checkIs4KResolution(w, h);
      const resolutionStr = `${w}×${h} (${is4K ? '4K UHD' : 'Standard HD'})`;

      const newVideoData: FourKVideoData = {
        id: `vid-4k-${Date.now()}`,
        videoUrl: uploaded.url,
        thumbnailUrl: uploaded.thumbnailUrl || previewThumbnail || undefined,
        width: w,
        height: h,
        resolution: resolutionStr,
        fileSize: selectedFile.size,
        duration: Math.round(videoDimensions?.duration || 0),
        caption: caption.trim() || undefined,
        status: 'PENDING',
        uploadedAt: new Date().toISOString()
      };

      setVideoData(newVideoData);
      onVideoChange(newVideoData);

      // If propertyId is already available, also register directly with videos API
      if (propertyId) {
        try {
          await api.videos.upload4K({
            propertyId,
            videoUrl: uploaded.url,
            thumbnailUrl: newVideoData.thumbnailUrl,
            width: w,
            height: h,
            fileSize: selectedFile.size,
            duration: Math.round(videoDimensions?.duration || 0),
            caption: caption.trim() || undefined
          });
        } catch (apiErr) {
          console.warn('Background registration error, will persist with listing:', apiErr);
        }
      }

      setSelectedFile(null);
      onShowToast('4K video tour attached successfully! Ready for admin verification.', 'success');
    } catch (err: any) {
      console.error('Error uploading 4K video:', err);
      onShowToast(err.message || 'Failed to complete 4K video upload', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Attach video via direct URL (YouTube, Drive, MP4 link)
  const handleAttachUrl = () => {
    const trimmed = customUrl.trim();
    if (!trimmed) {
      onShowToast('Please enter a valid video link', 'error');
      return;
    }

    const newVideoData: FourKVideoData = {
      id: `vid-4k-url-${Date.now()}`,
      videoUrl: trimmed,
      thumbnailUrl: previewThumbnail || undefined,
      width: 3840,
      height: 2160,
      resolution: '3840×2160 (4K UHD Stream)',
      fileSize: 0,
      duration: 90,
      caption: caption.trim() || 'Online 4K Walkthrough Tour',
      status: 'PENDING',
      uploadedAt: new Date().toISOString()
    };

    setVideoData(newVideoData);
    onVideoChange(newVideoData);
    setCustomUrl('');
    onShowToast('Video tour link attached! Pending admin verification.', 'success');
  };

  // Remove attached video
  const handleRemoveVideo = () => {
    setVideoData(null);
    setSelectedFile(null);
    setVideoDimensions(null);
    setDimensionError(null);
    setPreviewThumbnail(null);
    setCaption('');
    setCustomUrl('');
    onVideoChange(null);
    onShowToast('4K video walkthrough removed.', 'info');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Update caption
  const handleCaptionChange = (val: string) => {
    setCaption(val);
    if (videoData) {
      const updated = { ...videoData, caption: val };
      setVideoData(updated);
      onVideoChange(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* 4K UHD Standard Guidelines Card */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 rounded-2xl border border-emerald-500/30 text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 uppercase tracking-wide flex items-center gap-1 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Virtual Campus Inspection
            </span>
            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              4K UHD Standard
            </span>
          </div>

          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Uncut Walkthrough
          </span>
        </div>

        <div className="space-y-1">
          <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-400" />
            4K Video Walkthrough Tour (Agent Verified Standard)
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Record an uncut 4K video showing the property gate, compound, self-contain / room interior, private bathroom, running water tap, and prepaid sub-meter. Once audited by the campus verification team, your listing earns the <strong>"4K Verified & Live"</strong> badge on student search.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-slate-400 block text-[10px]">Min. Resolution</span>
            <span className="font-bold text-emerald-300">3840×2160 (4K)</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-slate-400 block text-[10px]">Mobile Portrait</span>
            <span className="font-bold text-emerald-300">2160×3840 (Vertical)</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-slate-400 block text-[10px]">Max File Size</span>
            <span className="font-bold text-emerald-300">250 MB (Chunked)</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-slate-400 block text-[10px]">Formats</span>
            <span className="font-bold text-emerald-300">MP4, WebM, MOV</span>
          </div>
        </div>
      </div>

      {/* Active Video Preview Player (when video is already attached) */}
      {videoData && videoData.videoUrl ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Attached 4K Video Walkthrough</span>
                  <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                    {videoData.resolution || '4K UHD'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {propertyName ? `Associated with ${propertyName}` : 'Ready for admin audit on listing submission'}
                </p>
              </div>
            </div>

            {/* Status Pill */}
            <div>
              {videoData.status === 'VERIFIED' ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ✓ 4K VERIFIED & LIVE
                </span>
              ) : videoData.status === 'REJECTED' ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white flex items-center gap-1 shadow-xs">
                  <XCircle className="w-3.5 h-3.5" />
                  ✗ REJECTED
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  ⏳ Pending Admin Verification
                </span>
              )}
            </div>
          </div>

          {/* Video Player Display */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-80 mx-auto shadow-inner border border-slate-700">
            <video
              ref={videoPlayerRef}
              src={videoData.videoUrl}
              poster={videoData.thumbnailUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {/* Technical Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Duration</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {videoData.duration ? `${Math.floor(videoData.duration / 60)}m ${Math.round(videoData.duration % 60)}s` : 'Full Walkthrough'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">File Size</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {videoData.fileSize ? `${(videoData.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'Stream Link'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Resolution</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 truncate block">
                {videoData.resolution || '3840×2160 px'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Audit Status</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {videoData.status || 'PENDING'}
              </span>
            </div>
          </div>

          {/* Caption Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Video Walkthrough Caption
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => handleCaptionChange(e.target.value)}
              placeholder="e.g. Uncut tour of front compound, self-contain room, borehole water and prepaid meter"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions: Replace or Remove */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Replace 4K Video
            </button>

            <button
              type="button"
              onClick={handleRemoveVideo}
              className="px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove Video
            </button>
          </div>
        </div>
      ) : (
        /* Video Upload / Attachment Controls */
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleSelectFile}
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
          />

          {/* Selected File Stage (before chunked upload) */}
          {selectedFile ? (
            <div className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-500/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileVideo className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-xs">
                      {selectedFile.name}
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setVideoDimensions(null);
                    setDimensionError(null);
                    setPreviewThumbnail(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 4K Resolution Verification Banner */}
              {videoDimensions && (
                <div
                  className={`p-3 rounded-xl border space-y-1 text-xs ${
                    dimensionError
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {dimensionError ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span>
                        {dimensionError ? 'Resolution Warning' : 'Verified 4K UHD Resolution!'}
                      </span>
                    </span>
                    <span className="font-mono text-[11px]">
                      {videoDimensions.width} × {videoDimensions.height} px
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {dimensionError ||
                      `Meets the 4K UHD standard (${videoDimensions.width}×${videoDimensions.height}, ${Math.round(videoDimensions.duration)}s duration).`}
                  </p>
                </div>
              )}

              {/* Captured Thumbnail Frame Preview */}
              {previewThumbnail && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                    Auto-Captured Cover Thumbnail (Frame 1.5s):
                  </span>
                  <div className="h-28 max-w-sm rounded-xl overflow-hidden bg-black relative border border-slate-200 dark:border-slate-700">
                    <img src={previewThumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold bg-black/80 text-white px-2 py-0.5 rounded">
                      Auto Frame
                    </span>
                  </div>
                </div>
              )}

              {/* Optional Caption */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Video Caption (Optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Uncut tour of front compound, self-contain room, borehole water and prepaid meter"
                  disabled={isUploading}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Live Upload Progress */}
              {uploadProgress !== null && (
                <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-emerald-500/30">
                  <div className="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Uploading 4K Video in Resumable Chunks...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadVideo}
                  disabled={isUploading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploading ? 'Uploading 4K Chunks...' : 'Confirm & Upload 4K Video'}
                </button>
              </div>
            </div>
          ) : (
            /* Choice between Local File Picker and Link Attachment */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-black">Upload 4K Video from Device / Camera</span>
                  <span className="text-[10px] text-emerald-100">MP4, WebM, QuickTime MOV (Max 250MB)</span>
                </button>
              </div>

              {/* Or Paste Video URL Fallback */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  Or attach cloud video link (YouTube, Google Drive, Direct MP4 URL):
                </span>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAttachUrl}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    Attach Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Optional notice */}
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Tip:</strong> If you do not have your 4K video walkthrough ready today, you can save your hostel as a Draft or submit photos now, and upload the 4K walkthrough anytime from <strong>Hostel Operation → 4K Videos</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
