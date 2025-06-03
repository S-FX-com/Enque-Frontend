'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import BoringAvatar from 'boring-avatars';

interface AgentAvatarProps {
  avatarUrl: string | null | undefined;
  agentName: string;
  agentEmail?: string;
  onAvatarChange: (newAvatarUrl: string | null) => void;
  isUpdating?: boolean;
  size?: number;
  showEditButton?: boolean;
  variant?: 'beam' | 'marble' | 'pixel' | 'sunset' | 'ring' | 'bauhaus';
}

export function AgentAvatar({
  avatarUrl,
  agentName,
  agentEmail,
  onAvatarChange,
  isUpdating = false,
  size = 48,
  showEditButton = true,
  variant = 'beam',
}: AgentAvatarProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const avatarSize = size;
  const buttonSize = Math.max(16, Math.round(size * 0.4));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Avatar file selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeKB: (file.size / 1024).toFixed(2) + ' KB',
    });

    // Validate file size - max 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error(
        `Image is too large. Maximum size is 2MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      );
      return;
    }

    // Check if the file is a valid image format
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only PNG, JPG, JPEG and WebP images are supported.');
      return;
    }

    try {
      // Use FileReader to convert the file to data URL
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onAvatarChange(result);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing avatar image:', error);
      toast.error('Could not process the image. Try with a different image.');
    }
  };

  const handleRemoveAvatar = () => {
    onAvatarChange(null);
  };

  const avatarColors = ['#1D73F4', '#D4E4FA'];
  const boringAvatarName = agentEmail || agentName || 'default-avatar';

  return (
    <div className="relative inline-block">
      <div
        className="relative rounded-full overflow-hidden border cursor-pointer"
        style={{ height: avatarSize, width: avatarSize }}
        onMouseEnter={() => showEditButton && !isUpdating && setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
      >
        {avatarUrl ? (
          <div className="w-full h-full relative p-1">
            <Image
              src={avatarUrl}
              alt={`${agentName} avatar`}
              fill={true}
              className="object-contain"
              onError={e => {
                console.error('Avatar image failed to load:', e);
              }}
              sizes={`${avatarSize}px`}
              priority={true}
              key={avatarUrl}
            />
          </div>
        ) : (
          <BoringAvatar
            size={avatarSize}
            name={boringAvatarName}
            variant={variant}
            colors={avatarColors}
          />
        )}

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/jpg,image/webp"
          style={{ display: 'none' }}
          disabled={isUpdating}
        />

        {/* Edit overlay */}
        {showEditButton && !isUpdating && showOverlay && (
          <div
            className="absolute top-0 left-0 rounded-full bg-black/50 text-white cursor-pointer flex items-center justify-center"
            style={{ height: avatarSize, width: avatarSize, fontSize: Math.round(avatarSize * 0.4) }}
            title="Upload avatar (max. 2MB)"
            onClick={() => fileInputRef.current?.click()}
          >
            <Pencil size={Math.round(avatarSize * 0.4)} />
          </div>
        )}
      </div>

      {/* Remove button - moved outside the overflow-hidden container */}
      {showEditButton && !isUpdating && avatarUrl && (
        <span
          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-sm border border-white hover:bg-red-600 transition-colors z-10"
          style={{ height: buttonSize, width: buttonSize }}
          title="Remove avatar"
          onClick={handleRemoveAvatar}
        >
          <X size={Math.round(buttonSize * 0.6)} />
        </span>
      )}

      {/* Loading indicator */}
      {isUpdating && (
        <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
} 