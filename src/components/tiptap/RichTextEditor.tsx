'use client';

import React, { useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import HardBreak from '@tiptap/extension-hard-break';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { Extension } from '@tiptap/core';
import { RichTextToolbar } from './RichTextToolbar';
import './tiptap-styles.css';
import { uploadImage } from '@/services/upload';
import { toast } from 'sonner';
import './mention.css';
import suggestion from './mention/suggestion';
import Mention from '@tiptap/extension-mention';

interface Props {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onAttachmentsChange?: (files: File[]) => void;
  ableMentioning?: boolean;
}

// Extensión personalizada para manejar doble espacio en listas
const ListKeyboardShortcuts = Extension.create({
  name: 'listKeyboardShortcuts',

  addKeyboardShortcuts() {
    let lastSpaceTime = 0;

    return {
      Space: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { empty, $head } = selection;

        if (!empty) return false;

        const isInList = $head.parent.type.name === 'listItem';
        if (!isInList) return false;

        const nodeContent = $head.parent.textContent;

        if (nodeContent.trim() === '') {
          editor.chain().liftListItem('listItem').run();
          return true;
        }

        const now = Date.now();
        const isDoubleSpace = now - lastSpaceTime < 500;
        lastSpaceTime = now;

        if (isDoubleSpace && $head.parentOffset === nodeContent.length) {
          editor.commands.deleteRange({
            from: $head.pos - 1,
            to: $head.pos,
          });

          editor.chain().createParagraphNear().liftListItem('listItem').run();
          return true;
        }

        return false;
      },
    };
  },
});

// Extensión personalizada para imágenes redimensionables
const ResizableImage = Image.extend({
  name: 'resizableImage',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => {
          const width = element.getAttribute('width') || element.style.width;
          return width ? Number.parseInt(width) : null;
        },
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const height = element.getAttribute('height') || element.style.height;
          return height ? Number.parseInt(height) : null;
        },
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const container = document.createElement('div');
      container.className = 'image-resizer';
      container.style.cssText = `
        position: relative;
        display: inline-block;
        max-width: 100%;
        line-height: 0;
      `;

      const img = document.createElement('img');
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        img.setAttribute(key, value);
      });

      // Establecer dimensiones iniciales si no existen
      const initialWidth = node.attrs.width || 300;
      const initialHeight = node.attrs.height || 200;

      img.style.cssText = `
        max-width: 100%;
        height: auto;
        width: ${initialWidth}px;
        border-radius: 4px;
        cursor: pointer;
      `;

      // Crear handles de redimensionamiento
      const createHandle = (position: string) => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-handle-${position}`;
        handle.style.cssText = `
          position: absolute;
          width: 10px;
          height: 10px;
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          cursor: ${
            position.includes('e') || position.includes('w')
              ? 'ew-resize'
              : position.includes('n') || position.includes('s')
                ? 'ns-resize'
                : position.includes('nw') || position.includes('se')
                  ? 'nw-resize'
                  : 'ne-resize'
          };
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 10;
        `;

        // Posicionar handles
        switch (position) {
          case 'nw':
            handle.style.top = '-5px';
            handle.style.left = '-5px';
            break;
          case 'ne':
            handle.style.top = '-5px';
            handle.style.right = '-5px';
            break;
          case 'sw':
            handle.style.bottom = '-5px';
            handle.style.left = '-5px';
            break;
          case 'se':
            handle.style.bottom = '-5px';
            handle.style.right = '-5px';
            break;
        }

        return handle;
      };

      const handles = ['nw', 'ne', 'sw', 'se'].map(createHandle);
      handles.forEach(handle => container.appendChild(handle));

      // Mostrar/ocultar handles al hacer hover
      container.addEventListener('mouseenter', () => {
        handles.forEach(handle => (handle.style.opacity = '1'));
      });

      container.addEventListener('mouseleave', () => {
        handles.forEach(handle => (handle.style.opacity = '0'));
      });

      // Lógica de redimensionamiento
      let isResizing = false;
      let startX = 0;
      let startY = 0;
      let startWidth = 0;
      let startHeight = 0;
      let aspectRatio = 1;

      const startResize = (e: MouseEvent, handle: HTMLElement) => {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = img.offsetWidth;
        startHeight = img.offsetHeight;
        aspectRatio = startWidth / startHeight;

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);

        // Prevenir selección de texto durante el redimensionamiento
        document.body.style.userSelect = 'none';
      };

      const handleResize = (e: MouseEvent) => {
        if (!isResizing) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Calcular nuevas dimensiones manteniendo la proporción
        let newWidth = startWidth + deltaX;
        let newHeight = newWidth / aspectRatio;

        // Límites mínimos y máximos
        newWidth = Math.max(50, Math.min(800, newWidth));
        newHeight = newWidth / aspectRatio;

        img.style.width = `${newWidth}px`;
        img.style.height = 'auto';
      };

      const stopResize = () => {
        if (!isResizing) return;

        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        document.body.style.userSelect = '';

        // Actualizar los atributos del nodo
        const newWidth = img.offsetWidth;
        const newHeight = img.offsetHeight;

        if (typeof getPos === 'function') {
          const pos = getPos();
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, null, {
              ...node.attrs,
              width: newWidth,
              height: newHeight,
            })
          );
        }
      };

      // Agregar event listeners a los handles
      handles.forEach(handle => {
        handle.addEventListener('mousedown', e => startResize(e, handle));
      });

      container.appendChild(img);

      return {
        dom: container,
        update: updatedNode => {
          if (updatedNode.type.name !== this.name) return false;

          // Actualizar atributos de la imagen
          Object.entries(updatedNode.attrs).forEach(([key, value]) => {
            if (key === 'src' || key === 'alt' || key === 'title') {
              img.setAttribute(key, value);
            }
          });

          if (updatedNode.attrs.width) {
            img.style.width = `${updatedNode.attrs.width}px`;
          }

          return true;
        },
      };
    };
  },
});

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  disabled = false,
  onAttachmentsChange,
}: Props) {
  const handlePasteImage = useCallback(async (file: File, editor: Editor) => {
    try {
      const result = await uploadImage(file);

      if (result && result.url) {
        editor
          .chain()
          .focus()
          .setImage({
            src: result.url,
            alt: 'Pasted Image',
            width: 300,
            height: 200,
          })
          .run();

        toast.success('Image uploaded and inserted successfully!');
      }
    } catch (error) {
      console.error('Failed to upload pasted image:', error);
      toast.error('Failed to upload pasted image. Please try using the image button instead.');
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            style: 'margin: 0 !important',
          },
        },
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bold: {},
        italic: {},
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
        listItem: {
          HTMLAttributes: {
            class: 'list-item',
          },
        },
        strike: false,
        code: false,
        gapcursor: false,
        dropcursor: false,
        hardBreak: false,
      }),
      HardBreak.configure(),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      }),
      Underline.configure(),
      Placeholder.configure({
        placeholder: placeholder || 'Type your message...',
      }),
      // Usar la extensión personalizada de imagen redimensionable
      ResizableImage.configure({
        inline: false,
        allowBase64: false,
      }),
      ListKeyboardShortcuts,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: suggestion(),
      }),
    ],
    content: content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'max-w-none focus:outline-none p-2 border rounded-md min-h-[120px] max-h-[1200px] overflow-hidden resize-none',
      },
      handlePaste: (view, event) => {
        const currentEditor = editor;
        if (disabled || !currentEditor) return false;

        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              handlePasteImage(file, currentEditor);
              return true;
            }
          }
        }

        return false;
      },
    },
  });

  React.useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  return (
    <div className="flex flex-col">
      <RichTextToolbar editor={editor} onAttachmentsChange={onAttachmentsChange} />
      <EditorContent editor={editor} />
    </div>
  );
}
