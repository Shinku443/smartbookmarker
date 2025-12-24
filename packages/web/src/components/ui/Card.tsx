import React from "react";
import clsx from "clsx";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "bg-emperor-surface rounded-card p-4 shadow-sm border border-emperor-border",
        className
      )}
      {...props}
    />
  );
}
