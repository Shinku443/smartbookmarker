import React from "react";
import clsx from "clsx";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full bg-emperor-surfaceStrong text-emperor-text border border-emperor-border rounded-card px-3 py-2 focus:ring-2 focus:ring-emperor-primary focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
