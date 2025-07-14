import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { MentionUser } from '@/services/mentions';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export interface MentionListProps {
  items: MentionUser[];
  command: (props: { id: number; label: string }) => void;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({
          id: item.id,
          label: item.name,
        });
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }

        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }

        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    const getRoleColor = (role?: string) => {
      switch (role) {
        case 'admin':
          return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        case 'manager':
          return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'agent':
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        default:
          return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      }
    };

    const getTypeColor = (type: 'agent' | 'user') => {
      return type === 'agent' 
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    };

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
        {items.length ? (
          items.map((item, index) => (
            <button
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                index === selectedIndex && 'bg-gray-50 dark:bg-gray-700'
              )}
              key={`${item.type}-${item.id}`}
              onClick={() => selectItem(index)}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                {item.name.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.name}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs px-1.5 py-0.5", getTypeColor(item.type))}
                  >
                    {item.type === 'agent' ? 'Agente' : 'Usuario'}
                  </Badge>
                  {item.role && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs px-1.5 py-0.5", getRoleColor(item.role))}
                    >
                      {item.role}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {item.email}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
            No se encontraron usuarios
          </div>
        )}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList'; 