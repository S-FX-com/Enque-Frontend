// frontend/src/components/modals/new-user-modal.tsx
import React, { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { createUser } from '@/services/user';
import { useAuth } from '@/hooks/use-auth';
import type { IAgent } from '@/typescript/user';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { getCompanies } from '@/services/company'; // Import company service
import type { ICompany } from '@/typescript/company'; // Import ICompany type

// Removed placeholder data

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void; // Callback to refresh user list
}

const NewUserModal: React.FC<NewUserModalProps> = ({ isOpen, onClose, onSaveSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState<string | undefined>(undefined); // Store company ID as string or undefined
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user: currentAgent } = useAuth() as { user: IAgent | null };

  // Fetch companies using React Query
  const {
    data: companies = [],
    isLoading: isLoadingCompanies,
    error: companiesError,
  } = useQuery<ICompany[]>({
    queryKey: ['modalCompanies'], // Use a distinct query key for the modal
    queryFn: () => getCompanies({ limit: 1000 }), // Fetch a large limit
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: isOpen, // Only fetch when the modal is open
  });

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setCompanyId(undefined); // Reset company selection
      setPhoneNumber('');
      setError(null);
      setIsSaving(false);
      // React Query handles fetching based on 'enabled: isOpen'
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Name and Email are required.");
      return;
    }
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
        setError("Please enter a valid email address.");
      return;
    }
    // Ensure we have the workspace_id from the current agent
    if (!currentAgent?.workspace_id) {
        setError("Could not determine the current workspace. Please refresh and try again.");
        return;
    }


    setError(null);
    setIsSaving(true);

    try {
      // Include workspace_id in the payload
      const userData = {
          name: name.trim(),
          email: email.trim(),
          company_id: companyId && companyId !== "null" ? parseInt(companyId, 10) : null,
          phone: phoneNumber.trim() || null,
          workspace_id: currentAgent.workspace_id // Add workspace_id from agent
      };
      console.log("Attempting to save User:", userData);

      // Call createUser with the correctly typed userData
      // Ensure company_id is number or null, not string "null"
      const finalCompanyId = companyId === 'null' ? null : (companyId ? parseInt(companyId, 10) : null);
      const response = await createUser({ ...userData, company_id: finalCompanyId });

      if (response.success && response.data) {
        toast.success(`User "${response.data.name}" created successfully!`);
        onSaveSuccess(); // Callback to refresh list
        onClose(); // Close modal
      } else {
        // Handle API error message
        setError(response.message || "Failed to create user. Please try again.");
      }

    } catch (err) { // Catch network errors or unexpected issues
      console.error("Failed to save user (catch block):", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // Removed Animation variants

  return (
    // Removed AnimatePresence wrapper
    // {isOpen && (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-black">
          {/* Removed motion.div wrapper */}
          {/* <motion.div ... > */}
            <DialogHeader>
              <DialogTitle>New User</DialogTitle>
          <DialogDescription>
            Enter the details for the new user.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && <p className="col-span-4 text-red-600 text-sm">{error}</p>}
          <div className="grid grid-cols-4 items-center gap-4">
            {/* Removed text-right */}
            <Label htmlFor="user-name" className="self-center">
              Name*
            </Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              disabled={isSaving}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-email" className="self-center">
              Email*
            </Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
              disabled={isSaving}
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-company" className="self-center">
              Company
            </Label>
             <Select
                value={companyId}
                onValueChange={setCompanyId}
                disabled={isLoadingCompanies || isSaving}
             >
                <SelectTrigger id="user-company" className="col-span-3">
                    <SelectValue placeholder={isLoadingCompanies ? "Loading..." : "Select company..."} />
                </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="null">-- No Company --</SelectItem>
                    {companiesError ? (
                        <SelectItem value="error" disabled>Error loading companies</SelectItem>
                    ) : (
                        companies.map((company) => (
                            <SelectItem key={company.id} value={company.id.toString()}> {/* Ensure value is string */}
                                {company.name}
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-phone" className="self-center">
              Phone number
            </Label>
            <Input
              id="user-phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="col-span-3"
              disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save User'}
          </Button>
            </DialogFooter>
          {/* </motion.div> */}
        </DialogContent>
      </Dialog>
    // )}
  );
};

export default NewUserModal;
