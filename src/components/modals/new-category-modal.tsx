"use client";

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input'; // Corrected import path and removed extra quote
import { Label } from '@/components/ui/label';
import { createCategory } from '@/services/category'; // We'll create this service function next
// ICategory removed as it's unused in this component
import { getCurrentUser } from '@/lib/auth'; // To get workspace_id

interface NewCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NewCategoryModal({ isOpen, onClose }: NewCategoryModalProps) {
    const queryClient = useQueryClient();
    const [categoryName, setCategoryName] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Local loading state for the mutation

    const mutation = useMutation({
        mutationFn: async (newCategoryData: { name: string; workspace_id: number }) => {
            setIsLoading(true);
            // We need to create the createCategory service function
            const response = await createCategory(newCategoryData);
            // Check if the response indicates success (adjust based on your fetchAPI structure)
            if (!response || !response.success) {
                 // Throw an error with the message from the backend if available
                 throw new Error(response?.message || 'Failed to create category');
            }
            return response.data; // Assuming response.data contains the created category
        },
        onSuccess: (data) => {
            toast.success(`Category "${data?.name}" created successfully!`);
            queryClient.invalidateQueries({ queryKey: ['categories'] }); // Refetch categories list
            setCategoryName(''); // Reset input
            onClose(); // Close modal on success
        },
        onError: (error) => {
            toast.error(`Error creating category: ${error.message}`);
        },
        onSettled: () => {
            setIsLoading(false); // Reset loading state regardless of outcome
        }
    });

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!categoryName.trim()) {
            toast.error("Category name cannot be empty.");
            return;
        }

        const user = await getCurrentUser();
        if (!user?.workspace_id) {
             toast.error("Could not determine your workspace. Please log in again.");
             return;
        }

        mutation.mutate({ name: categoryName.trim(), workspace_id: user.workspace_id });
    };

    // Handle closing the dialog (e.g., clicking X or outside)
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setCategoryName(''); // Reset name when closing
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {/* Add bg-white to force white background */}
            <DialogContent className="sm:max-w-[425px] bg-white"> 
                <DialogHeader>
                    <DialogTitle>New Category</DialogTitle>
                    {/* Optional: Add DialogDescription if needed */}
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category-name" className="text-right">
                                Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="category-name"
                                value={categoryName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategoryName(e.target.value)} // Added type for 'e'
                                className="col-span-3"
                                required
                                disabled={isLoading} // Disable input while loading
                            />
                        </div>
                    </div>
                    <DialogFooter>
                         {/* Use DialogClose for the Cancel button */}
                        <DialogClose asChild>
                             <Button type="button" variant="outline" disabled={isLoading}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
