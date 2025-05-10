'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose, // Import DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl?: string;
  onSetLink: (url: string) => void;
}

export function LinkModal({ isOpen, onOpenChange, initialUrl = '', onSetLink }: Props) {
  const [url, setUrl] = useState(initialUrl);

  // Reset url when modal opens with a new initialUrl
  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
    }
  }, [isOpen, initialUrl]);

  const handleConfirm = () => {
    onSetLink(url.trim()); // Trim whitespace
    onOpenChange(false); // Close modal
  };

  // Handle Enter key press in input
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission if wrapped in form
      handleConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialUrl ? 'Edit link' : 'Add link'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="link-url" className="text-right">
              URL
            </Label>
            <Input
              id="link-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKeyDown} // Add keydown handler
              className="col-span-3"
              placeholder="https://example.com"
              autoFocus // Focus input on open
            />
          </div>
        </div>
        <DialogFooter>
          {/* Add a Cancel button */}
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleConfirm}>
            {initialUrl ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
