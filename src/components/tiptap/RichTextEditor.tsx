'use client';

import React from 'react';
// Removed unused Editor type import
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import HardBreak from '@tiptap/extension-hard-break';
import Image from '@tiptap/extension-image'; // Import Image extension
import { RichTextToolbar } from './RichTextToolbar';
import './tiptap-styles.css';

interface Props {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onAttachmentsChange?: (files: File[]) => void;
  // Add other props like 'editable' if needed based on context
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  disabled = false,
  onAttachmentsChange,
}: Props) {
  const editor = useEditor({
    extensions: [
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
        bulletList: {}, // Enables bullet list command
        orderedList: {}, // Enables ordered list command
        listItem: {},
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
      Placeholder.configure({
        placeholder: placeholder || 'Type your message...',
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          // No default classes needed here now
        },
      }).extend({
        // Extend the Image extension to add custom attribute handling
        addAttributes() {
          return {
            ...this.parent?.(), // Keep existing attributes like src, alt, title
            width: {
              default: null,
              // Parse width attribute from HTML
              parseHTML: element => element.getAttribute('width'),
              // Render width attribute back to HTML
              renderHTML: attributes => {
                if (!attributes.width) {
                  return {};
                }
                return { width: attributes.width };
              },
            },
            height: {
              default: null,
              // Parse height attribute from HTML
              parseHTML: element => element.getAttribute('height'),
              // Render height attribute back to HTML
              renderHTML: attributes => {
                if (!attributes.height) {
                  return {};
                }
                return { height: attributes.height };
              },
            },
            // Keep style attribute handling if we decide to use it later, otherwise remove
            style: {
              default: null,
              parseHTML: element => element.getAttribute('style'),
              renderHTML: attributes => {
                if (!attributes.style) {
                  return {};
                }
                return { style: attributes.style };
              },
            },
          };
        },
      }),
    ],
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
          'max-w-none focus:outline-none p-2 border rounded-md min-h-[80px] max-h-[300px] overflow-y-auto',
      },
    },
  });

  // Set content programmatically if the external content changes
  // Set content programmatically if the external content changes
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
