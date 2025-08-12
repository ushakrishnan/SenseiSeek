
"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface Option {
  value: string;
  label: string;
  disable?: boolean;
  /** Fixed options are not removable. */
  fixed?: boolean;
}

interface MultiSelectProps extends React.HTMLAttributes<HTMLDivElement> {
  options: Option[];
  onValueChange: (value: string[]) => void;
  defaultValue: string[];
  placeholder?: string;
  /** Allow users to create new options. */
  creatable?: boolean;
  className?: string;
}

export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      onValueChange,
      defaultValue,
      placeholder = "Select options",
      creatable = true,
      className,
      ...props
    },
    ref
  ) => {
    const [inputValue, setInputValue] = React.useState("");
    const [open, setOpen] = React.useState(false);

    const handleSelect = (value: string) => {
      setInputValue("");
      if (!defaultValue.includes(value)) {
        onValueChange([...defaultValue, value]);
      }
    };

    const handleRemove = (value: string) => {
      onValueChange(defaultValue.filter((v) => v !== value));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && inputValue) {
        e.preventDefault();
        const newOption = inputValue.trim();
        if (
          creatable &&
          newOption &&
          !defaultValue.includes(newOption) &&
          !options.some((opt) => opt.value === newOption)
        ) {
          onValueChange([...defaultValue, newOption]);
          setInputValue("");
          setOpen(false);
        }
      }
    };

    const filteredOptions = options.filter(
      (option) => !defaultValue.includes(option.value)
    );
    
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            ref={ref}
            role="combobox"
            aria-expanded={open}
            className={cn(
              buttonVariants({variant: 'outline'}), 
              "w-full h-auto min-h-10 items-center",
              defaultValue.length > 0 ? "justify-start" : "justify-between",
              className
            )}
            onClick={() => setOpen(!open)}
            {...props}
          >
              <div className="flex flex-wrap gap-1">
                  {defaultValue.map((value) => (
                      <Badge key={value} variant="secondary" className="gap-1.5">
                      {options.find(opt => opt.value === value)?.label || value}
                      <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(value);
                          }}
                          className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                      </Badge>
                  ))}
                  {defaultValue.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
              </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command onKeyDown={handleKeyDown}>
            <div className="flex items-center border-b px-3">
                <CommandInput
                    value={inputValue}
                    onValueChange={setInputValue}
                    placeholder="Search or create..."
                    className="flex-1 border-0 bg-transparent p-0 py-2 outline-none focus:ring-0"
                />
            </div>
            <CommandList>
                <CommandEmpty>
                    {creatable ? 'No results found. Press Enter to create.' : 'No results found.'}
                </CommandEmpty>
                <CommandGroup>
                    {filteredOptions.map((option) => (
                    <CommandItem
                        key={option.value}
                        onMouseDown={(e) => e.preventDefault()}
                        onSelect={() => handleSelect(option.value)}
                    >
                        {option.label}
                    </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

MultiSelect.displayName = "MultiSelect";
