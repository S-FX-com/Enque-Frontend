// {'use client'}

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';
// import { Button } from '@/components/ui/button'; // Removed unused Button import
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge'; // Restore Badge import

export type OptionType = {
  label: string;
  value: string; // Use string for value consistency
};

interface MultiSelectFilterProps {
  options: OptionType[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  placeholder?: string;
  className?: string;
  // title?: string; // Removed unused title prop
}

function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  className,
  // title // Removed title from destructuring
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  // Generate a unique ID for ARIA attributes
  const popoverContentId = React.useId();

  // Restore handleUnselect function
  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item));
  };

  // No need for buttonText anymore

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Changed Button to div and adjusted styling */}
        <div
          role="combobox"
          aria-controls={popoverContentId}
          aria-expanded={open}
          // Explicitly set bg-white dark:bg-black, remove hover effect for trigger area
          className={cn('w-full justify-between border border-input bg-white dark:bg-black rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[calc(theme(height.10))] px-3 py-2 flex items-center cursor-pointer', className)}
          onClick={() => setOpen(!open)}
        >
          <div className="flex gap-1 flex-wrap">
             {/* Render badges for selected items */}
             {selected.length > 0 ? selected.map((value) => {
               const option = options.find((opt) => opt.value === value);
               return (
                 <Badge
                   variant="secondary" // Secondary variant usually has a grey background
                   key={value}
                   // Use bg-white dark:bg-gray-800 for badges? Or keep secondary? Let's keep secondary for now.
                   className="mr-1 border border-border" // Add border for definition
                   onMouseDown={(e) => {
                      e.preventDefault(); // Prevent default focus behavior
                      e.stopPropagation(); // Prevent popover trigger click
                   }}
                   onClick={(e) => {
                      e.stopPropagation(); // Prevent popover trigger click
                      handleUnselect(value); // Call unselect handler
                   }}
                 >
                   {option ? option.label : value}
                   <X className="ml-1 h-3 w-3 cursor-pointer hover:text-foreground" />
                 </Badge>
               );
             }) : (
                // Show placeholder if nothing is selected
                <span className="text-muted-foreground text-sm">{placeholder}</span>
             )}
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      {/* Added side="bottom" to force dropdown below the trigger */}
      <PopoverContent id={popoverContentId} side="bottom" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onChange(
                      selected.includes(option.value)
                        ? selected.filter((item) => item !== option.value)
                        : [...selected, option.value]
                    );
                    // setOpen(true); // Keep popover open after selection - might be annoying, let it close
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selected.includes(option.value) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {selected.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange([])}
                    className="justify-center text-center cursor-pointer" // Added cursor-pointer
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelectFilter };
