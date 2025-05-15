// frontend/src/components/tiptap/RichTextToolbar.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react'; // Importar useEffect
import { type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Paperclip,
  X as XIcon, // <<< NUEVO: Importar icono X
} from 'lucide-react'; // Removed unused Upload icon
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
import { useMutation } from '@tanstack/react-query'; // Import useMutation
import { uploadImage as uploadImageService } from '@/services/upload'; // Import upload service
import { toast } from 'sonner'; // Import toast

interface Props {
  editor: Editor | null;
  onAttachmentsChange?: (files: File[]) => void; // <<< NUEVO: Prop para notificar cambios en adjuntos
}

export function RichTextToolbar({ editor, onAttachmentsChange }: Props) {
  // <<< MODIFICADO: Añadir prop
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [initialLinkUrl, setInitialLinkUrl] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State for selected image file
  const imageInputRef = useRef<HTMLInputElement>(null); // Ref for image file input

  // --- Estados y Refs para ADJUNTOS ---
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]); // State for multiple attachments
  const attachmentInputRef = useRef<HTMLInputElement>(null); // Ref for attachment input

  // <<< NUEVO: useEffect para notificar al padre cuando los adjuntos cambian >>>
  useEffect(() => {
    if (onAttachmentsChange) {
      onAttachmentsChange(selectedAttachments);
    }
    // Limpiar el valor del input para permitir seleccionar el mismo archivo después de quitarlo
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  }, [selectedAttachments, onAttachmentsChange]);

  // --- Upload Mutation ---
  const uploadMutation = useMutation({
    mutationFn: uploadImageService, // Use the imported service function
    onSuccess: data => {
      toast.success('Image uploaded successfully!');
      // Insert the uploaded image URL into the editor
      if (editor && data?.url) {
        // Usar la URL tal como viene del servicio sin modificarla
        const src = data.url;
        
        // Apply fixed dimensions using both attributes and inline styles
        const attrs: {
          src: string;
          width?: number;
          height?: number;
          alt?: string;
          style?: string;
        } = {
          src, // Use the URL returned from the backend
          alt: selectedFile?.name || 'Uploaded Image', // Use file name as alt text
          width: 150,
          height: 92,
          style: 'width: 150px; height: 92px; max-width: 150px;', // Add style as well
        };
        editor.chain().focus().setImage(attrs).run();
      }
      setIsImageModalOpen(false); // Close modal on success
      setSelectedFile(null); // Reset file state
      setImageUrl(''); // Reset URL state
    },
    onError: error => {
      console.error('Image upload failed:', error);
      toast.error(`Image upload failed: ${error.message}`);
      // Keep modal open on error? Or close? Let's close for now.
      // setIsImageModalOpen(false);
      setSelectedFile(null); // Reset file state
    },
  });

  // Callback to open the link modal
  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const url = editor.getAttributes('link').href || '';
    setInitialLinkUrl(url);
    setIsLinkModalOpen(true);
  }, [editor]);

  // Callback to handle setting the link from the modal
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

  // Callback to open the image modal
  const openImageModal = useCallback(() => {
    setImageUrl('');
    setSelectedFile(null); // Reset selected file
    setIsImageModalOpen(true);
  }, []);

  // Callback to handle setting the image from URL input
  const handleSetImageFromUrl = useCallback(() => {
    if (editor && imageUrl) {
      // No modificar URLs externas que ya comienzan con http o https
      const src = imageUrl;
      
      // Apply fixed dimensions using both attributes and inline styles
      const attrs: { src: string; width?: number; height?: number; alt?: string; style?: string } =
        {
          src,
          alt: 'Signature Image',
          width: 150,
          height: 92,
          style: 'width: 150px; height: 92px; max-width: 150px;', // Add style as well
        };
      editor.chain().focus().setImage(attrs).run();
    }
    setIsImageModalOpen(false);
  }, [editor, imageUrl]);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImageUrl(''); // Clear URL input if file is selected
    }
  };

  // Handle attachment file selection
  const handleAttachmentFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedAttachments(prev => {
        const newFiles = Array.from(files);
        // Filtrar duplicados basados en el nombre del archivo
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

  // Callback to open the attachment selector
  const openAttachmentSelector = useCallback(() => {
    attachmentInputRef.current?.click();
  }, []);

  // Handle image insertion (either from URL or Upload)
  const handleInsertImage = () => {
    if (selectedFile) {
      // Trigger the upload mutation
      uploadMutation.mutate(selectedFile);
    } else if (imageUrl) {
      // Insert from URL
      handleSetImageFromUrl();
    }
    // If neither is present, the button should be disabled
  };

  // <<< NUEVO: Manejar eliminación de un adjunto >>>
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
        {/* Add bg-white to force white background */}
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Insert from URL */}
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
                }} // Clear file if URL is typed
                className="col-span-3"
                placeholder="https://example.com/image.png"
                disabled={uploadMutation.isPending}
              />
            </div>

            {/* Separator */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  {' '}
                  {/* Changed bg-background to bg-white */}
                  Or
                </span>
              </div>
            </div>

            {/* Upload File */}
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

      {/* <<< NUEVO: Botón de Adjuntar Archivos >>> */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8')}
        onClick={openAttachmentSelector}
        // disabled={!editor} // Habilitar según la lógica de la aplicación
        title="Attach files"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      {/* <<< NUEVO: Input de archivo oculto para imágenes (renombrado) >>> */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileChange}
        accept="image/*" // Solo imágenes para este input
        style={{ display: 'none' }}
      />

      {/* <<< NUEVO: Input de archivo oculto para adjuntos >>> */}
      <input
        type="file"
        ref={attachmentInputRef}
        onChange={handleAttachmentFileChange}
        multiple // Permitir múltiples archivos
        style={{ display: 'none' }}
      />

      {/* <<< NUEVO: Sección para mostrar adjuntos seleccionados >>> */}
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
