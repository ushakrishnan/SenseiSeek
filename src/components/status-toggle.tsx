
"use client";

import { useState, useTransition } from 'react';
import { useToast } from "@/hooks/use-toast";
import { updateStartupNeedStatus } from '@/lib/actions';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface StatusToggleProps {
  needId: string;
  initialStatus: 'active' | 'inactive';
}

export function StatusToggle({ needId, initialStatus }: StatusToggleProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(initialStatus);

  const handleClick = () => {
    const newStatus = status === 'active' ? 'inactive' : 'active';
    setStatus(newStatus); // Optimistic update

    startTransition(async () => {
      const result = await updateStartupNeedStatus(needId, newStatus);
      if (result.status === 'error') {
        // Revert optimistic update on error
        setStatus(status);
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Status Updated",
          description: `Role is now ${newStatus}.`
        })
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        status === 'active' ? 'bg-primary' : 'bg-gray-300'
      )}
      aria-label={`Set status to ${status === 'active' ? 'inactive' : 'active'}`}
    >
      <span className="sr-only">Use to toggle status</span>
      {isPending && (
          <Loader2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-white" />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          status === 'active' ? 'translate-x-5' : 'translate-x-0',
          isPending ? 'opacity-50' : ''
        )}
      />
    </button>
  );
}
