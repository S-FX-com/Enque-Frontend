import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance, Targets } from 'tippy.js';
import { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import MentionList from './MentionList';
import { Editor } from '@tiptap/react';
import { getAgents } from '@/services/agent';
import { Agent } from '@/typescript/agent';
import 'tippy.js/dist/tippy.css';

let agentsCache: { data: Agent[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; 
let searchTimeout: NodeJS.Timeout | null = null;

async function getAgentsWithCache() {
  const now = Date.now();

  if (agentsCache && (now - agentsCache.timestamp) < CACHE_DURATION) {
    return agentsCache.data;
  }
  const agents = await getAgents();
  agentsCache = { data: agents, timestamp: now };
  return agents;
}

export default function suggestion() {
  return {
    items: async ({ query }: { query: string; editor: Editor }): Promise<string[]> => {
      return new Promise<string[]>((resolve) => {
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
        if (!query.trim()) {
          resolve([]);
          return;
        }
        searchTimeout = setTimeout(async () => {
          try {
            const agents = await getAgentsWithCache();
            const filtered = agents
              .filter(agent => agent.name.toLowerCase().includes(query.toLowerCase()))
              .map(agent => agent.name)
              .slice(0, 8); 
            
            resolve(filtered);
          } catch (error) {
            console.error('Failed to fetch agents:', error);
            resolve([]);
          }
        }, 200); 
      });
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
}