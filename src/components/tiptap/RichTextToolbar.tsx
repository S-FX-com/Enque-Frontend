'use client';

import type React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  LinkIcon,
  ImageIcon,
  Paperclip,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LinkModal } from './LinkModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { uploadImage as uploadImageService } from '@/services/upload';
import { toast } from 'sonner';

interface Props {
  editor: Editor | null;
  onAttachmentsChange?: (files: File[]) => void;
}

export function RichTextToolbar({ editor, onAttachmentsChange }: Props) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [initialLinkUrl, setInitialLinkUrl] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (onAttachmentsChange) {
      onAttachmentsChange(selectedAttachments);
    }
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  }, [selectedAttachments, onAttachmentsChange]);

  const uploadMutation = useMutation({
    mutationFn: uploadImageService,
    onSuccess: data => {
      toast.success('Image uploaded successfully!');
      if (editor && data?.url) {
        const src = data.url;

        const attrs: {
          src: string;
          width?: number;
          height?: number;
          alt?: string;
        } = {
          src,
          alt: selectedFile?.name || 'Uploaded Image',
          width: 300,
          height: 200,
        };
        editor.chain().focus().setImage(attrs).run();
      }
      setIsImageModalOpen(false);
      setSelectedFile(null);
      setImageUrl('');
    },
    onError: error => {
      console.error('Image upload failed:', error);
      toast.error(`Image upload failed: ${error.message}`);
      setSelectedFile(null);
    },
  });

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const url = editor.getAttributes('link').href || '';
    setInitialLinkUrl(url);
    setIsLinkModalOpen(true);
  }, [editor]);

  const handleSetLink = useCallback(
    (url: string) => {
      if (!editor) return;
      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    },
    [editor]
  );

  const openImageModal = useCallback(() => {
    setImageUrl('');
    setSelectedFile(null);
    setIsImageModalOpen(true);
  }, []);

  const handleSetImageFromUrl = useCallback(() => {
    if (editor && imageUrl) {
      const src = imageUrl;

      const attrs: { src: string; width?: number; height?: number; alt?: string } = {
        src,
        alt: 'Image from URL',
        width: 300,
        height: 200,
      };
      editor.chain().focus().setImage(attrs).run();
    }
    setIsImageModalOpen(false);
  }, [editor, imageUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImageUrl('');
    }
  };

  const handleAttachmentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedAttachments(prev => {
        const newFiles = Array.from(files);
        const updatedAttachments = [...prev];
        newFiles.forEach(newFile => {
          if (!prev.find(existingFile => existingFile.name === newFile.name)) {
            updatedAttachments.push(newFile);
          }
        });
        return updatedAttachments;
      });
    }
  };

  const openAttachmentSelector = useCallback(() => {
    attachmentInputRef.current?.click();
  }, []);

  const handleInsertImage = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    } else if (imageUrl) {
      handleSetImageFromUrl();
    }
  };

  const handleRemoveAttachment = (fileNameToRemove: string) => {
    setSelectedAttachments(prev => prev.filter(file => file.name !== fileNameToRemove));
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 border-b pb-2 mb-2 flex-wrap">
      {/* Formatting Buttons */}
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
        className={cn(
          'h-8 w-8',
          editor.isActive('italic') ? 'bg-accent text-accent-foreground' : ''
        )}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8',
          editor.isActive('underline') ? 'bg-accent text-accent-foreground' : ''
        )}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8',
          editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : ''
        )}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={!editor.can().chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8',
          editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : ''
        )}
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
        onClick={openLinkModal}
        disabled={editor.state.selection.empty && !editor.isActive('link')}
        title="Link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8')}
        onClick={openImageModal}
        disabled={!editor.can().chain().focus().setImage({ src: '' }).run()}
        title="Image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>

      {/* Link Modal */}
      <LinkModal
        isOpen={isLinkModalOpen}
        onOpenChange={setIsLinkModalOpen}
        initialUrl={initialLinkUrl}
        onSetLink={handleSetLink}
      />

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="imageUrl" className="text-right">
                Image URL
              </Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={e => {
                  setImageUrl(e.target.value);
                  setSelectedFile(null);
                }}
                className="col-span-3"
                placeholder="https://example.com/image.png"
                disabled={uploadMutation.isPending}
              />
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="imageUpload" className="text-right">
                Upload File
              </Label>
              <div className="col-span-3">
                <Input
                  id="imageUpload"
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  onChange={handleFileChange}
                  className="text-sm file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  disabled={uploadMutation.isPending}
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImageModalOpen(false)}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleInsertImage}
              disabled={(!imageUrl && !selectedFile) || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Insert Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8')}
        onClick={openAttachmentSelector}
        title="Attach files"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <input
        type="file"
        ref={attachmentInputRef}
        onChange={handleAttachmentFileChange}
        multiple
        style={{ display: 'none' }}
      />

      {/* Selected attachments display */}
      {selectedAttachments.length > 0 && (
        <div className="mt-2 p-2 border rounded-md bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Selected files:</p>
          <div className="flex flex-wrap gap-2">
            {selectedAttachments.map(file => (
              <div
                key={file.name}
                className="flex items-center text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 max-w-xs"
              >
                <Paperclip className="h-3 w-3 mr-1.5 flex-shrink-0" />
                <span className="truncate flex-grow" title={file.name}>
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1 p-0 hover:bg-slate-200 dark:hover:bg-slate-600"
                  onClick={() => handleRemoveAttachment(file.name)}
                  title={`Remove ${file.name}`}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}