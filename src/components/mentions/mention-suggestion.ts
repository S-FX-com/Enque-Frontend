import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { MentionList, MentionListRef } from './mention-list';
import { getWorkspaceMentions, MentionUser } from '@/services/mentions';

export const createMentionSuggestion = () => {
  console.log('🔧 Creating mention suggestion configuration...');
  
  return {
    char: '@',
    
    items: async ({ query }: { query: string }) => {
      console.log('🔍 Mention items called with query:', `"${query}"`);
      
      try {
        // Obtener menciones del workspace
        const mentions = await getWorkspaceMentions();
        console.log('📦 Loaded mentions from service:', mentions.length);

        if (!query || query.trim() === '') {
          console.log('📋 No query, returning all mentions');
          return mentions;
        }

        const filtered = mentions.filter(item => 
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.email.toLowerCase().includes(query.toLowerCase())
        );
        
        console.log('🔎 Filtered mentions:', filtered.length, 'results for query:', `"${query}"`);
        return filtered;
      } catch (error) {
        console.error('❌ Error loading mentions:', error);
        
        // Fallback a datos de prueba si hay error
        const testMentions: MentionUser[] = [
          { id: 1, name: 'Juan Pérez', email: 'juan@example.com', type: 'agent', role: 'admin' },
          { id: 2, name: 'María García', email: 'maria@example.com', type: 'agent', role: 'agent' },
          { id: 3, name: 'Carlos López', email: 'carlos@example.com', type: 'user' },
        ];
        
        if (!query || query.trim() === '') {
          return testMentions;
        }
        
        return testMentions.filter(item => 
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.email.toLowerCase().includes(query.toLowerCase())
        );
      }
    },

    render: () => {
      console.log('🎨 Creating mention render configuration...');
      let component: ReactRenderer<MentionListRef> | undefined;
      let popup: TippyInstance | undefined;

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStart: (props: any) => {
          console.log('🎯 Mention popup starting...', props);
          console.log('🔍 Props details:', {
            items: props.items?.length,
            clientRect: !!props.clientRect,
            range: props.range,
            query: props.query
          });
          
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            console.log('❌ No clientRect provided');
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            zIndex: 9999,
          })[0];
          
          console.log('✅ Mention popup created successfully');
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUpdate(props: any) {
          console.log('🔄 Mention popup updating...', {
            items: props.items?.length,
            query: props.query
          });
          component?.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup?.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onKeyDown(props: any) {
          console.log('⌨️ Mention key pressed:', props.event.key);
          if (props.event.key === 'Escape') {
            popup?.hide();
            return true;
          }

          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          console.log('👋 Mention popup exiting...');
          popup?.destroy();
          component?.destroy();
        },
      };
    },
  };
}; 