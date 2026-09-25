"use client";

import type { DisclosureLevel, ReaderToken } from "@gbt/shared";
import { IconClose } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { WordDetail } from "./word-detail";

interface Props {
  /** The word being looked up; null closes the sheet. */
  token: ReaderToken | null;
  verseRef: string;
  level: DisclosureLevel;
  onLevelChange: (level: DisclosureLevel) => void;
  onClose: () => void;
  /** Where focus returns when the sheet closes (the tapped word), without scrolling. */
  returnFocus: () => HTMLElement | null | undefined;
}

/**
 * The phone's word sheet: a bottom Drawer (vaul) over the undimmed text, as the design draws it.
 * Esc, tapping outside and swiping down all close it.
 */
export function WordSheet({ token, verseRef, level, onLevelChange, onClose, returnFocus }: Props) {
  return (
    <Drawer open={token !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent
        aria-describedby={undefined}
        onCloseAutoFocus={(e) => {
          e.preventDefault(); // Radix would focus the page; return to the word instead.
          returnFocus()?.focus({ preventScroll: true });
        }}
      >
        {token && (
          <div className="overflow-y-auto px-6 pt-4 pb-9">
            <DrawerDescription className="sr-only">{verseRef}</DrawerDescription>
            <WordDetail
              key={token.id}
              token={token}
              level={level}
              onLevelChange={onLevelChange}
              variant="sheet"
              title={(word, className) => (
                <DrawerTitle lang="grc" className={className}>
                  {word}
                </DrawerTitle>
              )}
              closeButton={
                <DrawerClose asChild>
                  <Button variant="secondary" size="icon" aria-label="Close">
                    <IconClose size={20} />
                  </Button>
                </DrawerClose>
              }
              actions={
                <DrawerClose asChild>
                  <Button variant="ink">Back to text</Button>
                </DrawerClose>
              }
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
