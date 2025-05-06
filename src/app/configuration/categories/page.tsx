"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BaseResponse } from '@/lib/fetch-api';
import { getCategories, deleteCategory } from '@/services/category';
import { ICategory } from '@/typescript/category';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NewCategoryModal } from '@/components/modals/new-category-modal';

const columns = [
    { accessorKey: 'name', header: 'Name' },
];

export default function CategoriesPage() {
    const queryClient = useQueryClient();
    const { data: categories = [], isLoading, isError, error } = useQuery<ICategory[]>({
        queryKey: ['categories'],
        queryFn: () => getCategories(),
        staleTime: 5 * 60 * 1000,
    });
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);

    const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedCategoryIds(new Set(categories.map(category => category.id)));
        } else {
            setSelectedCategoryIds(new Set());
        }
    };

    // Handle row checkbox change
    const handleRowSelectChange = (categoryId: number, checked: boolean | 'indeterminate') => {
        setSelectedCategoryIds(prev => {
            const next = new Set(prev);
            if (checked === true) {
                next.add(categoryId);
            } else {
                next.delete(categoryId);
            }
            return next;
        });
    };

    // Determine header checkbox state
    const isAllSelected = categories.length > 0 && selectedCategoryIds.size === categories.length;
    const isIndeterminate = selectedCategoryIds.size > 0 && selectedCategoryIds.size < categories.length;
    const headerCheckboxState = isAllSelected ? true : (isIndeterminate ? 'indeterminate' : false);

    // --- Delete Mutation ---
    const deleteCategoriesMutation = useMutation({
        mutationFn: async (categoryIds: number[]) => {
            const results = await Promise.allSettled(
                categoryIds.map(id => deleteCategory(id))
            );
            const failedDeletions = results
                .map((result, index) => ({ result, id: categoryIds[index] }))
                .filter(item => item.result.status === 'rejected');

            if (failedDeletions.length > 0) {
                 const errorMessages = failedDeletions.map(item => {
                     const reason = (item.result as PromiseRejectedResult).reason;
                     const message = (reason as { message?: string })?.message || `Category ID ${item.id}`;
                     return message;
                 }).join(', ');
                 throw new Error(`Failed to delete: ${errorMessages}`);
            }
            const nonSuccessResponses = results
                 .map((result, index) => ({ result, id: categoryIds[index] }))
                 .filter(item => item.result.status === 'fulfilled' && !(item.result as PromiseFulfilledResult<BaseResponse<unknown>>).value.success);

             if (nonSuccessResponses.length > 0) {
                 const errorMessages = nonSuccessResponses.map(item => {
                     const response = (item.result as PromiseFulfilledResult<BaseResponse<unknown>>).value;
                     return response.message || `Category ID ${item.id}`;
                 }).join(', ');
                 throw new Error(`Failed to delete: ${errorMessages}`);
             }

            return results;
        },
        onSuccess: (data, variables) => {
             const allSucceeded = data.every(result => result.status === 'fulfilled' && (result.value as BaseResponse<unknown>).success);

             if (allSucceeded) {
                 toast.success(`${variables.length} categor${variables.length === 1 ? 'y' : 'ies'} deleted successfully!`);
             } else {
                 toast.warning("Some categories could not be deleted.");
             }
        },
        onMutate: async (categoryIdsToDelete) => {
            await queryClient.cancelQueries({ queryKey: ['categories'] });
            const previousCategories = queryClient.getQueryData<ICategory[]>(['categories']);
            queryClient.setQueryData<ICategory[]>(['categories'], (old) =>
                old ? old.filter(category => !categoryIdsToDelete.includes(category.id)) : []
            );
            setSelectedCategoryIds(new Set());
            setIsDeleteDialogOpen(false);
            return { previousCategories };
        },
        onError: (err: Error, categoryIdsToDelete, context: { previousCategories?: ICategory[] } | undefined) => {
            toast.error(`Error deleting categories: ${err.message}`);
            if (context?.previousCategories) {
                queryClient.setQueryData(['categories'], context.previousCategories);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });

    const handleDeleteConfirm = () => {
        if (selectedCategoryIds.size > 0) {
            deleteCategoriesMutation.mutate(Array.from(selectedCategoryIds));
        }
    };

    return (
        <>
            <div className="container mx-auto px-4 md:px-6 flex flex-col h-full">
                {/* Header section */}
                <div className="flex items-center justify-between py-4 flex-shrink-0">
                    <h1 className="text-2xl font-bold">Categories</h1>
                    <div className="flex items-center gap-2">
                        {selectedCategoryIds.size > 0 && (
                            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={deleteCategoriesMutation.isPending}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete ({selectedCategoryIds.size})
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-white"> 
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the selected
                                            {selectedCategoryIds.size === 1 ? ' category' : ' categories'}. Associated tickets will have their category removed.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={deleteCategoriesMutation.isPending}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDeleteConfirm}
                                            disabled={deleteCategoriesMutation.isPending}
                                            className="bg-destructive text-white hover:bg-destructive/90"
                                        >
                                            {deleteCategoriesMutation.isPending ? 'Deleting...' : 'Delete'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <Button size="sm" onClick={() => setIsNewCategoryModalOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New
                        </Button>
                    </div>
                </div>

                <Card className="shadow-none border-0 flex-1 flex flex-col overflow-hidden">
                    <CardContent className="flex-1 overflow-hidden p-0">
                        <div className="h-full overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white dark:bg-black z-10">
                                    <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                                        <TableHead className="w-[50px] px-4">
                                            <Checkbox
                                                checked={headerCheckboxState}
                                                onCheckedChange={handleSelectAllChange}
                                                aria-label="Select all rows"
                                                disabled={isLoading || categories.length === 0}
                                            />
                                        </TableHead>
                                        {columns.map((column) => (
                                            <TableHead key={column.accessorKey}>{column.header}</TableHead>
                                        ))}
                                        <TableHead className="w-[50px] text-right">
                                            <span className="sr-only">Actions</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array.from({ length: 3 }).map((_, index) => (
                                            <TableRow key={`skeleton-${index}`}>
                                                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                                <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : isError ? (
                                        <TableRow>
                                            <TableCell colSpan={columns.length + 2} className="h-24 text-center text-red-500">
                                                Error loading categories: {error instanceof Error ? error.message : 'Unknown error'}
                                            </TableCell>
                                        </TableRow>
                                    ) : categories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={columns.length + 2} className="h-24 text-center">
                                            No categories found. Click &quot;+ New&quot; to add one.

                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        categories.map((category) => (
                                            <TableRow
                                                key={category.id}
                                                className="hover:bg-muted/50 cursor-pointer"
                                                data-state={selectedCategoryIds.has(category.id) ? 'selected' : ''}
                                            >
                                                <TableCell className="px-4">
                                                    <Checkbox
                                                        checked={selectedCategoryIds.has(category.id)}
                                                        onCheckedChange={(checked) => handleRowSelectChange(category.id, checked)}
                                                        aria-label={`Select row for ${category.name}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {category.name || '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <NewCategoryModal
                isOpen={isNewCategoryModalOpen}
                onClose={() => setIsNewCategoryModalOpen(false)}
            />
        </>
    );
}
