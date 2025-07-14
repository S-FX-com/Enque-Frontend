'use client';

import React, { useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import HardBreak from '@tiptap/extension-hard-break';
import Image from '@tiptap/extension-image'; // Import Image extension
import Underline from '@tiptap/extension-underline'; // Importar extensión de subrayado
import Mention from '@tiptap/extension-mention'; // Importar extensión de menciones
import { Extension } from '@tiptap/core'; // Importar Extension
import { RichTextToolbar } from './RichTextToolbar';
import './tiptap-styles.css';
import '../mentions/mentions.css'; // Importar estilos de menciones
import { uploadImage } from '@/services/upload'; // Importar el servicio de carga de imágenes
import { toast } from 'sonner';
import { createMentionSuggestion } from '@/components/mentions/mention-suggestion';

interface Props {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onAttachmentsChange?: (files: File[]) => void;
  enableMentions?: boolean; // Nueva prop para habilitar menciones
  // Add other props like 'editable' if needed based on context
}

// Extensión personalizada para manejar doble espacio en listas
const ListKeyboardShortcuts = Extension.create({
  name: 'listKeyboardShortcuts',

  addKeyboardShortcuts() {
    // Variable para registrar el último momento en que se presionó espacio
    let lastSpaceTime = 0;

    return {
      Space: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { empty, $head } = selection;

        // Solo funciona si el cursor está vacío (no hay texto seleccionado)
        if (!empty) return false;

        // Verificar si estamos en un elemento de lista
        const isInList = $head.parent.type.name === 'listItem';
        if (!isInList) return false;

        // Obtener el contenido del nodo actual
        const nodeContent = $head.parent.textContent;

        // Verificar si el nodo está vacío (solo tiene espacios o está totalmente vacío)
        if (nodeContent.trim() === '') {
          // Si está vacío, salir de la lista
          editor.chain().liftListItem('listItem').run();
          return true;
        }

        // Implementación del doble espacio (al estilo Word)
        const now = Date.now();
        const isDoubleSpace = now - lastSpaceTime < 500; // 500ms para detectar doble espacio

        // Actualizar el tiempo del último espacio
        lastSpaceTime = now;

        // Si es doble espacio, verificar la posición del cursor
        if (isDoubleSpace && $head.parentOffset === nodeContent.length) {
          // Estamos al final del texto y se detectó doble espacio
          // Primero eliminamos el espacio anterior
          editor.commands.deleteRange({
            from: $head.pos - 1,
            to: $head.pos,
          });

          // Insertamos un salto de línea y salimos de la lista
          editor.chain().createParagraphNear().liftListItem('listItem').run();

          return true;
        }

        // Si no es doble espacio o no estamos al final, continuar normalmente
        return false;
      },
    };
  },
});

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  disabled = false,
  onAttachmentsChange,
  enableMentions = false,
}: Props) {
  // Función para manejar el pegado de imágenes
  const handlePasteImage = useCallback(async (file: File, editor: Editor) => {
    try {
      // Eliminar la notificación de carga
      const result = await uploadImage(file);

      if (result && result.url) {
        // Insertar la imagen en el editor con dimensiones fijas
        editor
          .chain()
          .focus()
          .setImage({
            src: result.url,
            alt: 'Pasted Image',
          })
          .run();

        toast.success('Image uploaded and inserted successfully!');
      }
    } catch (error) {
      console.error('Failed to upload pasted image:', error);
      toast.error('Failed to upload pasted image. Please try using the image button instead.');
    }
  }, []);

  // Crear array de extensiones usando useMemo para evitar re-renders
  const extensions = React.useMemo(() => {
    const baseExtensions = [
      StarterKit.configure({
        paragraph: {},
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
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          width: 300,
          height: 200,
          style:
            'width: auto; height: auto; max-width: 300px; max-height: 200px; object-fit: contain; border-radius: 4px;',
        },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: 300,
              parseHTML: element => element.getAttribute('width'),
              renderHTML: attributes => {
                return { width: attributes.width };
              },
            },
            height: {
              default: 200,
              parseHTML: element => element.getAttribute('height'),
              renderHTML: attributes => {
                return { height: attributes.height };
              },
            },
            style: {
              default:
                'width: auto; height: auto; max-width: 300px; max-height: 200px; object-fit: contain; border-radius: 4px;',
              parseHTML: element => element.getAttribute('style'),
              renderHTML: attributes => {
                return { style: attributes.style };
              },
            },
          };
        },
      }),
      ListKeyboardShortcuts,
    ];

    // Agregar extensión de menciones solo si está habilitada
    if (enableMentions) {
      console.log('🔍 Mentions enabled, adding extension...');
      try {
        const mentionExtension = Mention.configure({
          HTMLAttributes: {
            class: 'mention',
          },
          renderLabel({ node }) {
            return `@${node.attrs.label ?? node.attrs.id}`;
          },
          suggestion: {
            char: '@',
            startOfLine: false,
            ...createMentionSuggestion(),
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any;
        baseExtensions.push(mentionExtension);
        console.log('✅ Mention extension added successfully');
        console.log('🔧 Mention extension config:', mentionExtension.options);
      } catch (error) {
        console.error('❌ Error adding mention extension:', error);
      }
    } else {
      console.log('❌ Mentions disabled');
    }

    return baseExtensions;
  }, [enableMentions, placeholder]);

  const editor = useEditor({
    extensions,
    content: content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // Get HTML content and pass it up
      const html = editor.getHTML();
      console.log('📝 Editor content updated:', html);
      onChange(html);
    },
    onCreate: ({ editor }) => {
      console.log('🎉 Editor created successfully');
      console.log('📋 Extensions loaded:', editor.extensionManager.extensions.map(ext => ext.name));
      
      // Verificar si la extensión de menciones está cargada
      const mentionExtension = editor.extensionManager.extensions.find(ext => ext.name === 'mention');
      if (mentionExtension) {
        console.log('✅ Mention extension found in editor:', mentionExtension);
      } else {
        console.log('❌ Mention extension NOT found in editor');
      }
    },
    // Basic editor styling directly or via CSS file
    editorProps: {
      attributes: {
        // Remove prose classes, keep basic styling and dimensions/scroll
        class:
          'max-w-none focus:outline-none p-2 border rounded-md min-h-[120px] max-h-[1200px] overflow-hidden resize-none',
      },
      // Añadir manejador de eventos para pegar
      handlePaste: (view, event) => {
        const currentEditor = editor;
        // Verificar que no esté deshabilitado y que el editor exista
        if (disabled || !currentEditor) return false;

        // Revisar si hay imágenes en el clipboard
        const items = event.clipboardData?.items;
        if (!items) return false;

        // Buscar imágenes en los datos del portapapeles
        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Si encontramos una imagen, manejarla
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              // Prevenir el comportamiento predeterminado
              event.preventDefault();
              // Cargar y insertar la imagen
              handlePasteImage(file, currentEditor);
              return true;
            }
          }
        }

        // Si no hay imágenes, dejar que TipTap maneje el pegado normalmente
        return false;
      },
    },
  });

  // Set content programmatically if the external content changes
  // (e.g., clearing the editor after sending)
  React.useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      // Restore comparison: Only set content if it actually differs
      editor.commands.setContent(content, false); // Set content without emitting update initially
    }
  }, [content, editor]);

  // Update editable state if disabled prop changes
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
