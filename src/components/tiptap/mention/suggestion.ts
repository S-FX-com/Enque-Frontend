/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';

import MentionList from './MentionList';
import { getAgents } from '@/services/agent';

interface TippyInstance {
  setProps: (props: { getReferenceClientRect: (() => DOMRect) | null }) => void;
  hide: () => void;
  destroy: () => void;
}

export default function suggestion() {
  return {
    items: ({ query }: { query: string }) => {
      return getAgents().then(data =>
        data
          .filter(agent => agent.name.toLowerCase().startsWith(query.toLowerCase()))
          .map(agent => agent.name)
          .slice(0, 5)
      );
    },

    render: () => {
      let component: ReactRenderer;
      let popup: TippyInstance[];

      return {
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
          });
        },

        onUpdate(props: any) {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown(props: any) {
          if (props.event.key === 'Escape') {
            popup[0].hide();

            return true;
          }

          return (component.ref as any)?.onKeyDown?.(props);
        },

        onExit() {
          popup[0].destroy();
          component.destroy();
        },
      };
    },
  };
}