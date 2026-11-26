import React, { useState } from 'react';
import { Stethoscope, HeartPulse } from 'lucide-react';

interface UserAvatarProps {
  photoURL?: string | null;
  name?: string | null;
  role?: 'patient' | 'doctor';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showRoleBadge?: boolean;
}

export const getInitials = (name?: string | null): string => {
  if (!name || !name.trim()) return '?';
  const clean = name.replace(/^dr\.?\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoURL,
  name,
  role = 'patient',
  size = 'md',
  className = '',
  showRoleBadge = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
    '2xl': 'w-28 h-28 text-3xl',
  };

  const badgeSizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
    '2xl': 'w-6 h-6',
  };

  const roleThemeClasses =
    role === 'doctor'
      ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-blue-500/20'
      : 'bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-teal-500/20';

  const initials = getInitials(name);
  const hasValidPhoto = Boolean(photoURL && !imageError);

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center font-extrabold uppercase shadow-md select-none ${sizeClasses[size]} ${
          hasValidPhoto ? 'bg-slate-100 dark:bg-slate-800' : roleThemeClasses
        }`}
      >
        {hasValidPhoto ? (
          <img
            src={photoURL!}
            alt={name || 'Avatar'}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {showRoleBadge && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center p-0.5 border-2 border-white dark:border-slate-900 ${
            role === 'doctor'
              ? 'bg-blue-600 text-white'
              : 'bg-teal-600 text-white'
          }`}
          title={role === 'doctor' ? 'Verified Doctor' : 'Patient'}
        >
          {role === 'doctor' ? (
            <Stethoscope className={badgeSizeClasses[size]} />
          ) : (
            <HeartPulse className={badgeSizeClasses[size]} />
          )}
        </span>
      )}
    </div>
  );
};
