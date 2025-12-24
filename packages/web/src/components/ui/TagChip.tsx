import React from "react";

type TagChipProps = {
  label: string;
  onClick?: () => void;
};

export function TagChip({ label, onClick }: TagChipProps) {
  return (
    <span
      onClick={onClick}
      className="
        inline-flex items-center
        bg-emperor-surfaceStrong
        text-emperor-text
        border border-emperor-border
        px-2 py-0.5
        rounded-full
        text-xs
        cursor-pointer
        hover:bg-emperor-surface
        transition
      "
    >
      #{label}
    </span>
  );
}