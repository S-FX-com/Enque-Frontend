'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyLogoProps {
  logoUrl: string | null | undefined;
  companyName: string;
  onLogoChange: (newLogoUrl: string | null) => void;
  isUpdating?: boolean;
  size?: number; // Add size prop to control logo size
}

export function CompanyLogo({ 
  logoUrl, 
  companyName, 
  onLogoChange, 
  isUpdating = false,
  size = 40 // Default size is 40px
}: CompanyLogoProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Use provided size or default
  const logoSize = size; 
  const buttonSize = Math.max(16, Math.round(size * 0.4)); // Scale button size with logo size

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Debug log the file info
    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeKB: (file.size / 1024).toFixed(2) + ' KB'
    });

    // Validate file size - max 2MB to be very generous
    if (file.size > 2 * 1024 * 1024) {
      toast.error(`Image is too large. Maximum size is 2MB. Current size: ${(file.size / 1024).toFixed(2)}KB`);
      return;
    }

    // Check if the file is a valid image format (PNG, JPG, JPEG)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only PNG, JPG and JPEG images are supported.');
      return;
    }

    try {
      // Use FileReader to convert the file to data URL
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // No resizing - use original image
        onLogoChange(result);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Could not process the image. Try with a different image.');
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange(null);
  };

  // Get the first letter of the company name for the fallback
  const nameInitial = companyName.charAt(0).toUpperCase();

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
    >
      <div className="relative inline-block leading-none overflow-hidden rounded-full bg-slate-50 dark:bg-slate-800" style={{ height: logoSize, width: logoSize }}>
        {logoUrl ? (
          <div className="w-full h-full relative p-1">
            <Image
              src={logoUrl}
              alt={`${companyName} logo`}
              fill={true} // Use fill instead of width/height
              className="object-contain p-1" // Use object-contain to show full logo
              onError={(e) => {
                // If image fails to load, show fallback
                console.error('Image failed to load:', e);
                e.currentTarget.src = `/fallback.png`;
              }}
              sizes={`${logoSize}px`} // Inform Next.js about the size
              priority={true} // Load with priority since it's visible
              key={logoUrl} // Add unique key based on the logo URL
            />
          </div>
        ) : (
          <div 
            className="rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
            style={{ height: logoSize, width: logoSize, fontSize: Math.max(16, Math.round(logoSize * 0.5)) }}
          >
            {nameInitial}
          </div>
        )}

        {/* Edit overlay */}
        {!isUpdating && showOverlay && (
          <div 
            className="avatar-overlay absolute top-0 left-0 rounded-full bg-black/50 text-white cursor-pointer flex items-center justify-center"
            style={{ height: logoSize, width: logoSize, fontSize: Math.round(logoSize * 0.4) }}
            title="Upload logo (max. 2MB)"
            onClick={() => fileInputRef.current?.click()}
          >
            <Pencil size={Math.round(logoSize * 0.4)} />
          </div>
        )}

        {/* Remove button */}
        {!isUpdating && logoUrl && (
          <span 
            className="absolute bottom-0 right-0 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-sm"
            style={{ height: buttonSize, width: buttonSize }}
            title="Remove logo"
            onClick={handleRemoveLogo}
          >
            <svg 
              stroke="currentColor" 
              fill="currentColor" 
              strokeWidth="0" 
              viewBox="0 0 1024 1024" 
              fillRule="evenodd" 
              height={`${Math.round(buttonSize * 0.8)}px`}
              width={`${Math.round(buttonSize * 0.8)}px`}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M512 64c247.4 0 448 200.6 448 448S759.4 960 512 960 64 759.4 64 512 264.6 64 512 64Zm0 76c-205.4 0-372 166.6-372 372s166.6 372 372 372 372-166.6 372-372-166.6-372-372-372Zm128.013 198.826c.023.007.042.018.083.059l45.02 45.019c.04.04.05.06.058.083a.118.118 0 0 1 0 .07c-.007.022-.018.041-.059.082L557.254 512l127.861 127.862a.268.268 0 0 1 .05.06l.009.023a.118.118 0 0 1 0 .07c-.007.022-.018.041-.059.082l-45.019 45.02c-.04.04-.06.05-.083.058a.118.118 0 0 1-.07 0c-.022-.007-.041-.018-.082-.059L512 557.254 384.14 685.115c-.042.041-.06.052-.084.059a.118.118 0 0 1-.07 0c-.022-.007-.041-.018-.082-.059l-45.02-45.019c-.04-.04-.05-.06-.058-.083a.118.118 0 0 1 0-.07c.007-.022.018-.041.059-.082L466.745 512l-127.86-127.86a.268.268 0 0 1-.05-.061l-.009-.023a.118.118 0 0 1 0-.07c.007-.022.018-.041.059-.082l45.019-45.02c.04-.04.06-.05.083-.058a.118.118 0 0 1 .07 0c.022.007.041.018.082.059L512 466.745l127.862-127.86c.04-.041.06-.052.083-.059a.118.118 0 0 1 .07 0Z"></path>
            </svg>
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileChange}
      />
    </div>
  );
} 