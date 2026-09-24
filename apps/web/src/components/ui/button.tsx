import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

// Koinē buttons: 56 / 48 / 44px heights and 44×44 icon buttons (touch-target minimum).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        /** Lapis: the one primary action on a screen. */
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        /** Surface with a line border: "Show me again", "Add to review". */
        outline: "border-border bg-card text-foreground hover:bg-muted",
        /** Sunken: icon buttons (listen, close) and quiet actions. */
        secondary: "bg-secondary text-secondary-foreground hover:bg-border",
        /** Ink: the strong neutral action, e.g. "Back to text". */
        ink: "bg-foreground text-background hover:bg-foreground/90",
        ghost: "hover:bg-muted hover:text-foreground",
        destructive: "bg-rubric-soft text-rubric hover:bg-rubric-soft/80",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        lg: "h-14 rounded-2xl px-6 text-base font-semibold",
        default: "h-12 rounded-xl px-5 text-[15px]",
        sm: "h-11 rounded-xl px-4 text-sm",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
