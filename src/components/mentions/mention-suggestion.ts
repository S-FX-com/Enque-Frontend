import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { MentionList, MentionListRef } from './mention-list';
import { getWorkspaceMentions, MentionUser } from '@/services/mentions';

export const createMentionSuggestion = () => {
  return {
    items: async ({ query }: { query: string }): Promise<MentionUser[]> => {
      console.log('🔍 Mention items called with query:', query);
      try {
        const allMentions = await getWorkspaceMentions();
        
        if (!query) {
          console.log('📋 No query, returning first 10 mentions');
          return allMentions.slice(0, 10); // Mostrar los primeros 10 por defecto
        }

        const filtered = allMentions
          .filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.email.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 10); // Limitar a 10 resultados
        
        console.log('🔎 Filtered mentions:', filtered.length, filtered);
        return filtered;
      } catch (error) {
        console.error('❌ Error fetching mention suggestions:', error);
        return [];
      }
    },

    render: () => {
      let component: ReactRenderer<MentionListRef> | undefined;
      let popup: TippyInstance | undefined;

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStart: (props: any) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
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
            theme: 'mention-list',
            maxWidth: 'none',
            zIndex: 9999,
          })[0];
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUpdate(props: any) {
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
          if (props.event.key === 'Escape') {
            popup?.hide();
            return true;
          }

          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup?.destroy();
          component?.destroy();
        },
      };
    },
  };
}; 