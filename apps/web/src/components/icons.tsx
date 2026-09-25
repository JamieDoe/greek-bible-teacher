// The design's own icon set (24×24 strokes, drawn at 1.75 by default), so every screen uses the
// exact shapes from the Koinē canvas rather than approximate library icons.
import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function icon(d: string, defaultStroke = 1.75) {
  function Icon({ size = 20, strokeWidth = defaultStroke, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        <path d={d} pathLength={1} />
      </svg>
    );
  }
  return Icon;
}

export const IconHome = icon("M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z");
export const IconLearn = icon(
  "M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 9h6M9 13h4",
);
export const IconRead = icon(
  "M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2zM12 6.5v14",
);
export const IconProgress = icon("M5 20v-9M12 20V5M19 20v-6");
export const IconSettings = icon("M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4");
export const IconCheck = icon("M5 12.5l4.5 4.5L19 7.5", 2.4);
export const IconClose = icon("M6 6l12 12M18 6 6 18");
export const IconArrowRight = icon("M5 12h14M13 6l6 6-6 6", 2);
export const IconBack = icon("M15 5l-7 7 7 7");
export const IconChevronRight = icon("M9 5l7 7-7 7");
export const IconPlus = icon("M12 5v14M5 12h14");
export const IconSpeaker = icon(
  "M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11",
);
