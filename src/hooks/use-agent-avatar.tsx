import React, { useEffect } from 'react';
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
  //const urlLoginM365: string = 'https://graph.microsoft.com/v1.0/me/';
  const urlLoginM365: string = 'https://graph.microsoft.com/v1.0/users/john.doe@contoso.com';
  const loggedInM365: boolean = true;

  const fetchMe = async () => {
    const response = await fetch(urlLoginM365);
    const data = await response.json();
    console.log(data);
  };

  useEffect(() => {
    if (loggedInM365) {
      fetchMe();
    }
  });

  const AvatarComponent = React.useMemo(() => {
    const avatarColors = ['#1D73F4', '#D4E4FA'];
    console.log(agent?.avatar);

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
        <BoringAvatar size={size} name={fallbackName} variant={variant} colors={avatarColors} />
      </div>
    );
  }, [agent?.avatar, agent?.name, size, variant, className, fallbackName]);

  return {
    AvatarComponent,
    hasCustomAvatar: !!agent?.avatar,
    fallbackName,
  };
}
