"use client";

import { cn } from "@my-better-t-app/ui/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/85",
        outline:
          "border border-input bg-card text-foreground hover:bg-muted/70 hover:border-foreground/20 active:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-foreground/8 active:bg-foreground/12",
        /** Tinted with the accent: the "add to cart" family of actions. */
        soft: "bg-primary-soft text-primary hover:bg-primary/15 active:bg-primary/20",
        ghost: "text-foreground hover:bg-muted/80 active:bg-muted",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
        /** Solid dark: the single most important action on a screen. */
        contrast: "bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/85",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
        xs: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8 [&_svg]:size-4",
        "icon-xs": "size-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
