import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { MentionList, MentionListRef } from './mention-list';
import { MentionUser } from '@/services/mentions';

export const createMentionSuggestion = () => {
  return {
    items: ({ query }: { query: string }) => {
      console.log('🔍 Mention items called with query:', query);
      
      // Datos de prueba para verificar que funciona
      const testMentions: MentionUser[] = [
        { id: 1, name: 'Juan Pérez', email: 'juan@example.com', type: 'agent', role: 'admin' },
        { id: 2, name: 'María García', email: 'maria@example.com', type: 'agent', role: 'agent' },
        { id: 3, name: 'Carlos López', email: 'carlos@example.com', type: 'user' },
      ];

      if (!query) {
        console.log('📋 No query, returning test mentions');
        return testMentions;
      }

      const filtered = testMentions.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.email.toLowerCase().includes(query.toLowerCase())
      );
      
      console.log('🔎 Filtered mentions:', filtered.length, filtered);
      return filtered;
    },

    render: () => {
      let component: ReactRenderer<MentionListRef> | undefined;
      let popup: TippyInstance | undefined;

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStart: (props: any) => {
          console.log('🎯 Mention popup starting...', props);
          
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
          
          console.log('✅ Mention popup created');
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUpdate(props: any) {
          console.log('🔄 Mention popup updating...', props);
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