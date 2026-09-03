import React from 'react';

interface UserAvatarProps {
  fullName?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  fullName,
  avatarUrl,
  size = 'md',
  className = ''
}) => {
  const safeName = (typeof fullName === 'string' && fullName.trim()) ? fullName.trim() : 'Student';

  const getInitials = (name: string): string => {
    if (!name || typeof name !== 'string') return 'HE';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.substring(0, 2) || 'HE').toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg font-bold'
  };

  const initials = getInitials(safeName);

  // Generate a deterministic soft gradient based on name
  const bgGradients = [
    'from-emerald-600 to-teal-700',
    'from-teal-600 to-emerald-800',
    'from-cyan-600 to-emerald-700',
    'from-emerald-700 to-slate-800'
  ];
  const charCode = safeName.charCodeAt(0) || 0;
  const gradient = bgGradients[charCode % bgGradients.length];

  const [hasError, setHasError] = React.useState(false);

  // Reset error if avatarUrl changes
  React.useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const isValidImage = Boolean(
    avatarUrl && 
    !hasError && 
    (avatarUrl.startsWith('http://') || 
     avatarUrl.startsWith('https://') || 
     avatarUrl.startsWith('data:') || 
     avatarUrl.startsWith('blob:') || 
     avatarUrl.startsWith('/'))
  );

  if (isValidImage && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName}
        className={`rounded-full object-cover border border-slate-200/80 shadow-xs ${sizeClasses[size]} ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} text-white font-black flex items-center justify-center shadow-xs border border-white/20 select-none ${sizeClasses[size]} ${className}`}
      title={fullName}
    >
      {initials}
    </div>
  );
};
