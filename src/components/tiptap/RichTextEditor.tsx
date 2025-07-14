'use client';

import React, { useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import HardBreak from '@tiptap/extension-hard-break';
import Image from '@tiptap/extension-image'; // Import Image extension
import Underline from '@tiptap/extension-underline'; // Importar extensión de subrayado
import { Extension } from '@tiptap/core'; // Importar Extension
import { RichTextToolbar } from './RichTextToolbar';
import './tiptap-styles.css';
import { uploadImage } from '@/services/upload'; // Importar el servicio de carga de imágenes
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
  ableMentioning = false,
}: Props) {
  console.log('📝 RichTextEditor rendered with ableMentioning:', ableMentioning);
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

  // Crear las extensiones base
  const baseExtensions = [
    StarterKit.configure({
      // Configure StarterKit extensions as needed
      // Ensure paragraph is enabled (default in StarterKit)
      paragraph: {},
      heading: false, // Disable headings if not needed
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      // Ensure basic formatting is enabled
      bold: {}, // Enables bold command
      italic: {}, // Enables italic command
      bulletList: {
        keepMarks: true,
        keepAttributes: true,
      }, // Enables bullet list command with additional configuration
      orderedList: {
        keepMarks: true,
        keepAttributes: true,
      }, // Enables ordered list command with additional configuration
      listItem: {
        HTMLAttributes: {
          class: 'list-item',
        },
      },
      // Disable others if not required
      strike: false,
      code: false,
      gapcursor: false,
      dropcursor: false,
      // Explicitly disable hardBreak default handling if we add the extension separately
      // Or configure it here if preferred. Let's add it separately for now.
      hardBreak: false,
    }),
    // Add HardBreak extension separately
    // This handles Shift+Enter and might influence Enter behavior in lists
    HardBreak.configure(),
    Link.configure({
      // Enables link commands
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        // Add attributes for security and usability
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
      },
    }),
    // Añadir la extensión de subrayado
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
      // Extend the Image extension to add custom attribute handling
      addAttributes() {
        return {
          ...this.parent?.(), // Keep existing attributes like src, alt, title
          width: {
            default: 300,
            // Parse width attribute from HTML
            parseHTML: element => element.getAttribute('width'),
            // Render width attribute back to HTML
            renderHTML: attributes => {
              return { width: attributes.width };
            },
          },
          height: {
            default: 200,
            // Parse height attribute from HTML
            parseHTML: element => element.getAttribute('height'),
            // Render height attribute back to HTML
            renderHTML: attributes => {
              return { height: attributes.height };
            },
          },
          // Keep style attribute handling if we decide to use it later, otherwise remove
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
    // Añadir la extensión personalizada para manejar doble espacio en listas
    ListKeyboardShortcuts,
  ];

  // Agregar extensión de menciones solo si está habilitada
  const extensions = ableMentioning 
    ? [
        ...baseExtensions,
        Mention.configure({
          HTMLAttributes: {
            class: 'mention',
          },
          suggestion: suggestion(),
        }),
      ]
    : baseExtensions;

  const editor = useEditor({
    extensions,
    content: content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // Get HTML content and pass it up
      onChange(editor.getHTML());
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

  //console.log(editor);
  return (
    <div className="flex flex-col">
      <RichTextToolbar editor={editor} onAttachmentsChange={onAttachmentsChange} />
      <EditorContent editor={editor} />
    </div>
  );
}