import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center" aria-label="Sensei Seek Logo">
      <span
        className="font-headline text-4xl font-bold text-[hsl(var(--exec-orange))]"
      >
        Sensei
      </span>
      <span
        className="font-headline text-4xl font-semibold text-[hsl(var(--exec-blue))] ml-1"
      >
        Seek
      </span>
    </div>
  );
}
