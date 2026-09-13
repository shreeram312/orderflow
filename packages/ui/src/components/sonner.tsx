"use client";

import { AlertCircle, Check, Info, Loader2, X } from "lucide-react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const FilledIcon = ({ children, className }: { children: React.ReactNode; className: string }) => (
  <div className={`flex size-5 shrink-0 items-center justify-center rounded-full ${className}`}>
    {children}
  </div>
);

/**
 * Plain white toasts for every variant. Only the icon carries the colour, so
 * success and error are still distinguishable at a glance without the panel
 * itself turning green or red.
 */
const TOAST_SURFACE =
  "!bg-white !text-neutral-950 !border !border-neutral-200 [&_[data-title]]:!text-neutral-950 [&_[data-description]]:!text-neutral-600 [&_[data-description]]:!opacity-100";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      // Pinned light: Sonner's dark theme would otherwise put near-white text
      // on these white surfaces.
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <FilledIcon className="bg-emerald-500">
            <Check className="h-3 w-3 stroke-[3] text-white" />
          </FilledIcon>
        ),
        info: (
          <FilledIcon className="bg-blue-500">
            <Info className="h-3 w-3 stroke-[2.5] text-white" />
          </FilledIcon>
        ),
        warning: (
          <FilledIcon className="bg-orange-400">
            <AlertCircle className="h-3 w-3 stroke-[2.5] text-white" />
          </FilledIcon>
        ),
        error: (
          <FilledIcon className="bg-red-500">
            <X className="h-3 w-3 stroke-[3] text-white" />
          </FilledIcon>
        ),
        loading: <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: `group toast !rounded-xl !px-4 !py-3 !shadow-md ${TOAST_SURFACE}`,
          title: "text-sm font-medium",
          description: "text-xs",
          default: TOAST_SURFACE,
          success: TOAST_SURFACE,
          error: TOAST_SURFACE,
          warning: TOAST_SURFACE,
          info: TOAST_SURFACE,
          loading: TOAST_SURFACE,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
