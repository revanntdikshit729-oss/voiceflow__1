import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { storageService, validatePhotoFile } from '../../services/storage';
import { dbService } from '../../services/db';
import { useAuth } from '../../contexts/AuthContext';
import { translations } from '../../i18n/translations';

interface ProfilePhotoUploadProps {
  currentPhotoURL?: string | null;
  name: string;
  role: 'patient' | 'doctor';
  onPhotoUpdated?: (newPhotoURL: string) => void;
}

export const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhotoURL,
  name,
  role,
  onPhotoUpdated,
}) => {
  const { currentUser, appLanguage, refreshProfile } = useAuth();
  const t = translations[appLanguage] || translations.en;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Trigger system file picker
  const handleTriggerPicker = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle file selected from device picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate type and size
    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      const msg =
        validation.errorKey === 'photoTypeError'
          ? t.photoTypeError
          : validation.errorKey === 'photoSizeError'
          ? t.photoSizeError
          : validation.message || t.photoUploadError;
      setErrorMessage(msg);
      return;
    }

    // Set file and local preview
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewURL(objectUrl);
  };

  // Cancel preview
  const handleCancelPreview = () => {
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
    }
    setSelectedFile(null);
    setPreviewURL(null);
    setErrorMessage(null);
  };

  // Save selected photo to Firebase Storage and update Firestore
  const handleSavePhoto = async () => {
    if (!selectedFile || !currentUser?.uid) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      // 1. Upload to Firebase Storage
      const downloadURL = await storageService.uploadProfilePhoto(
        selectedFile,
        currentUser.uid,
        role
      );

      // 2. Persist downloadURL in Firestore user profile
      if (role === 'patient') {
        await dbService.updatePatientPhoto(currentUser.uid, downloadURL);
      } else {
        await dbService.updateDoctorPhoto(currentUser.uid, downloadURL);
      }

      // 3. Delete previous storage object if replacing
      if (currentPhotoURL && currentPhotoURL !== downloadURL) {
        storageService.deleteProfilePhoto(currentPhotoURL).catch(() => {});
      }

      // 4. Refresh auth state across website
      await refreshProfile();
      if (onPhotoUpdated) {
        onPhotoUpdated(downloadURL);
      }

      setSuccessMessage(t.photoUploadSuccess);
      handleCancelPreview();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('[PhotoUpload] Upload error:', err);
      let errorText = t.photoUploadError;
      if (err.message && err.message.includes('Storage is not configured')) {
        errorText = t.photoStorageNotConfigured;
      } else if (err.message) {
        errorText = err.message;
      }
      setErrorMessage(errorText);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove existing photo
  const handleRemovePhoto = async () => {
    if (!currentUser?.uid || !currentPhotoURL) return;

    if (!window.confirm(t.removePhotoBtn + '?')) {
      return;
    }

    setIsRemoving(true);
    setErrorMessage(null);

    try {
      // 1. Remove from Firebase Storage
      await storageService.deleteProfilePhoto(currentPhotoURL);

      // 2. Clear photoURL in Firestore
      if (role === 'patient') {
        await dbService.updatePatientPhoto(currentUser.uid, '');
      } else {
        await dbService.updateDoctorPhoto(currentUser.uid, '');
      }

      // 3. Refresh app context
      await refreshProfile();
      if (onPhotoUpdated) {
        onPhotoUpdated('');
      }

      setSuccessMessage(t.photoRemoveSuccess);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('[PhotoUpload] Remove error:', err);
      setErrorMessage(err.message || t.photoUploadError);
    } finally {
      setIsRemoving(false);
    }
  };

  const activePhoto = previewURL || currentPhotoURL;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* Avatar Display / Preview */}
        <div className="relative group">
          <UserAvatar
            photoURL={activePhoto}
            name={name}
            role={role}
            size="xl"
            showRoleBadge={true}
            className="ring-4 ring-slate-100 dark:ring-slate-800"
          />

          <button
            type="button"
            onClick={handleTriggerPicker}
            disabled={isUploading || isRemoving}
            className="absolute inset-0 rounded-full bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
            title={currentPhotoURL ? t.replacePhotoBtn : t.uploadPhotoBtn}
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>

        {/* Info & Action Controls */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
              <span>{t.profilePhotoTitle}</span>
              {previewURL && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {t.photoPreviewTitle}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {t.profilePhotoDesc}
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Buttons: If Previewing file, show Save & Cancel; Otherwise show Upload/Change & Remove */}
          {previewURL ? (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{isUploading ? t.photoUploading : t.savePhotoBtn}</span>
              </button>

              <button
                type="button"
                onClick={handleCancelPreview}
                disabled={isUploading}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.cancelPhotoBtn}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={handleTriggerPicker}
                disabled={isUploading || isRemoving}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer ${
                  role === 'doctor'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{currentPhotoURL ? t.replacePhotoBtn : t.uploadPhotoBtn}</span>
              </button>

              {currentPhotoURL && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isUploading || isRemoving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isRemoving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{t.removePhotoBtn}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Feedback Alert */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Feedback Alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
