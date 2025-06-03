import React from 'react';
import Image from 'next/image';
import BoringAvatar from 'boring-avatars';
import { Agent } from '@/typescript/agent';

interface UseAgentAvatarProps {
  agent?: Agent | null;
  size?: number;
  variant?: 'beam' | 'marble' | 'pixel' | 'sunset' | 'ring' | 'bauhaus';
  className?: string;
}

export function useAgentAvatar({
  agent,
  size = 32,
  variant = 'beam',
  className = '',
}: UseAgentAvatarProps) {
  const fallbackName = agent?.email || agent?.name || 'default-avatar';

  const AvatarComponent = React.useMemo(() => {
    const avatarColors = ['#1D73F4', '#D4E4FA'];
    
    if (agent?.avatar) {
      return (
        <div 
          className={`relative rounded-full overflow-hidden ${className}`}
          style={{ width: size, height: size }}
        >
          <div className="w-full h-full relative p-1">
            <Image
              src={agent.avatar}
              alt={`${agent.name} avatar`}
              fill={true}
              className="object-contain"
              sizes={`${size}px`}
              onError={e => {
                console.error('Avatar image failed to load:', e);
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className={`rounded-full overflow-hidden ${className}`}>
        <BoringAvatar
          size={size}
          name={fallbackName}
          variant={variant}
          colors={avatarColors}
        />
      </div>
    );
  }, [agent?.avatar, agent?.name, size, variant, className, fallbackName]);

  return {
    AvatarComponent,
    hasCustomAvatar: !!agent?.avatar,
    fallbackName,
  };
} 