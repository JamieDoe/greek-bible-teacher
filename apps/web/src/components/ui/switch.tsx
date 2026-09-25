"use client";

import * as React from "react";
import { cn } from "cn";
import { Switch as SwitchPrimitive } from "radix-ui";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full border-0 p-0.5 transition-colors after:absolute after:-inset-x-3 after:-inset-y-2 data-checked:bg-primary data-unchecked:bg-border data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[26px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.2)] transition-transform duration-150 data-checked:translate-x-5 data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
