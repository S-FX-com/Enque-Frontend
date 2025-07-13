import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';

import MentionList from './MentionList';
import { getAgents } from '@/services/agent';

export default function suggestion() {
  const agentNames = [];
  /*const agentsNamesAPI = async () =>
    await getAgents().then(data =>
      data.forEach(agent => {
        //console.log(agent.name);
        agentNamesOff.push(agent.name);
      })
    );
  agentsNamesAPI();*/
  console.log(agentNames);
  return {
    items: ({ query }) => {
      /*return [
        'Lea Thompson',
        'Cyndi Lauper',
        'Tom Cruise',
        'Madonna',
        'Jerry Hall',
        'Joan Collins',
        'Winona Ryder',
        'Christina Applegate',
        'Alyssa Milano',
        'Molly Ringwald',
        'Ally Sheedy',
        'Debbie Harry',
        'Olivia Newton-John',
        'Elton John',
        'Michael J. Fox',
        'Axl Rose',
        'Emilio Estevez',
        'Ralph Macchio',
        'Rob Lowe',
        'Jennifer Grey',
        'Mickey Rourke',
        'John Cusack',
        'Matthew Broderick',
        'Justine Bateman',
        'Lisa Bonet',
      ]*/
      //return agentNamesOff
      return getAgents().then(data =>
        data
          .filter(agent => agent.name.toLowerCase().startsWith(query.toLowerCase()))
          .map(agent => agent.name)
          .slice(0, 5)
      );
    },

    render: () => {
      let component;
      let popup;

      return {
        onStart: props => {
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

        onUpdate(props) {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup[0].hide();

            return true;
          }

          return component.ref?.onKeyDown(props);
        },

        onExit() {
          popup[0].destroy();
          component.destroy();
        },
      };
    },
  };
}
