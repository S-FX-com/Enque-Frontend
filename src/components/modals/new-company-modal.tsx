// frontend/src/components/modals/new-company-modal.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
// import { motion, AnimatePresence } from 'framer-motion'; // Remove motion components import
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createCompany } from '@/services/company'; // Ensure service is imported
// No need to import CompanyCreate type here, service function defines it

interface NewCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void; // Callback to refresh company list
}

const NewCompanyModal: React.FC<NewCompanyModalProps> = ({ isOpen, onClose, onSaveSuccess }) => {
  const [name, setName] = useState('');
  const [emailDomain, setEmailDomain] = useState(''); // Changed from domain to emailDomain
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opening
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setEmailDomain(''); // Changed from setDomain
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Company name is required.');
      return;
    }
    // Basic domain validation (optional, can be more robust)
    if (emailDomain.trim() && !emailDomain.includes('.')) {
      // Changed from domain to emailDomain
      setError('Please enter a valid domain name (e.g., example.com).');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const companyData = {
        name: name.trim(),
        email_domain: emailDomain.trim() || null, // Changed from domain to email_domain and used emailDomain state
      };
      console.log('Attempting to save Company:', companyData);

      const response = await createCompany(companyData);

      if (response.success && response.data) {
        toast.success(`Company "${response.data.name}" created successfully!`);
        onSaveSuccess(); // Callback to refresh list
        onClose(); // Close modal
      } else {
        // Handle API error message
        setError(response.message || 'Failed to create company. Please try again.');
      }
    } catch (err) {
      // Catch network errors or unexpected issues
      console.error('Failed to save company (catch block):', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  // Removed Animation variants

  return (
    // Removed AnimatePresence wrapper
    // {isOpen && ( // No longer need conditional render here if Dialog handles it
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Removed motion props from DialogContent */}
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-black">
        {/* Removed motion.div wrapper */}
        {/* <motion.div ... > */}
        <DialogHeader>
          <DialogTitle>New Company</DialogTitle>
          <DialogDescription>
            Enter the details for the new company. Users with matching email domains can be
            automatically associated.
          </DialogDescription>
        </DialogHeader>
        {/* Changed grid layout to simple vertical stack */}
        <div className="space-y-4 py-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="company-name">Name*</Label>
            <Input
              id="company-name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-domain">Email domain</Label>
            <Input
              id="company-domain"
              value={emailDomain} // Changed from domain to emailDomain
              onChange={e => setEmailDomain(e.target.value.toLowerCase())} // Changed from setDomain
              placeholder="example.com"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground px-1">
              New users with this domain in their email addresses will be added to this company.
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Company'}
          </Button>
        </DialogFooter>
        {/* </motion.div> */}
      </DialogContent>
    </Dialog>
    // )}
  );
};

export default NewCompanyModal;
