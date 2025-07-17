import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance, Targets } from 'tippy.js';
import { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import MentionList from './MentionList';
import { Editor } from '@tiptap/react';
import { getAgents } from '@/services/agent';
import 'tippy.js/dist/tippy.css';

export default function suggestion() {
  return {
    items: async ({ query }: { query: string; editor: Editor }) => {
      try {
        const agents = await getAgents();
        return agents
          .filter(agent => agent.name.toLowerCase().startsWith(query.toLowerCase()))
          .map(agent => agent.name)
          .slice(0, 5);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        return [];
      }
    },

    render: () => {
      let component: ReactRenderer;
      let popup: Instance;

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          const target: Targets = document.body.getElementsByClassName('auto-expand-editor')[0];
          popup = tippy(target, {
            getReferenceClientRect: () =>
              ({
                width: 200,
                height: 200,
                left: target.getBoundingClientRect().left,
                right: target.getBoundingClientRect().right,
                top: target.getBoundingClientRect().top,
                bottom: target.getBoundingClientRect().bottom,
              }) as DOMRect,
            appendTo: () => target,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'left-start',
          });
        },

        onUpdate(props: SuggestionProps) {
          component.updateProps(props);

          const target: Targets = document.body.getElementsByClassName('auto-expand-editor')[0];

          popup.setProps({
            getReferenceClientRect: () =>
              ({
                width: 200,
                height: 200,
                left: target.getBoundingClientRect().left,
                right: target.getBoundingClientRect().right,
                top: target.getBoundingClientRect().top,
                bottom: target.getBoundingClientRect().bottom,
              }) as DOMRect,
          });
          component.updateProps(props);
        },

        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            popup.hide();

            return true;
          }

          return false;
        },

        onExit() {
          popup.destroy();
          component.destroy();
        },
      };
    },
  };
<<<<<<< HEAD
}
=======
}
>>>>>>> 0f9f96ac424022068b1e8061722a3aa053ece17f
