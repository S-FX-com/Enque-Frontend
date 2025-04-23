'use client';

import React, { useState, useCallback } from 'react'; // Import useState
import { type Editor } from '@tiptap/react';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LinkModal } from './LinkModal'; // Import the modal

interface Props {
  editor: Editor | null;
}

export function RichTextToolbar({ editor }: Props) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [initialLinkUrl, setInitialLinkUrl] = useState('');

  // Callback to open the modal
  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const url = editor.getAttributes('link').href || '';
    setInitialLinkUrl(url);
    setIsLinkModalOpen(true);
  }, [editor]);

  // Callback to handle setting the link from the modal
  const handleSetLink = useCallback((url: string) => {
    if (!editor) return;

    // empty url - remove link
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // set link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);


  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 border-b pb-2 mb-2">
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', editor.isActive('bold') ? 'bg-accent text-accent-foreground' : '')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', editor.isActive('italic') ? 'bg-accent text-accent-foreground' : '')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : '')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={!editor.can().chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
       <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : '')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        disabled={!editor.can().chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8', editor.isActive('link') ? 'bg-accent text-accent-foreground' : '')}
        onClick={openLinkModal} // Open modal instead of prompt
        // Disable if text is not selected or cannot set link
        disabled={editor.state.selection.empty && !editor.isActive('link')}
        title="Link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      {/* Placeholder for Paperclip */}
      {/* ... */}

      {/* Render the Link Modal */}
      <LinkModal
        isOpen={isLinkModalOpen}
        onOpenChange={setIsLinkModalOpen}
        initialUrl={initialLinkUrl}
        onSetLink={handleSetLink}
      />
    </div>
  );
}
