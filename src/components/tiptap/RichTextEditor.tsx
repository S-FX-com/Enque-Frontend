'use client';

import React from 'react';
// Removed unused Editor type import
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import HardBreak from '@tiptap/extension-hard-break'; // Import HardBreak
import { RichTextToolbar } from './RichTextToolbar'; // Import the toolbar
import './tiptap-styles.css'; // We'll create this file for basic styling

interface Props {
  content: string;
  onChange: (richText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  // Add other props like 'editable' if needed based on context
}

export function RichTextEditor({ content, onChange, placeholder, disabled = false }: Props) {
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
      Link.configure({ // Enables link commands
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
        // Re-add max-h-[300px] and overflow-y-auto
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none p-2 border rounded-md min-h-[80px] max-h-[300px] overflow-y-auto',
      },
    },
  });

  // Set content programmatically if the external content changes
  // (e.g., clearing the editor after sending)
  React.useEffect(() => {
    if (editor && editor.getHTML() !== content) {
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
      <RichTextToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
