import React from "react";
import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "subtle" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const base =
    "rounded-card font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emperor-primary";

  const variants = {
    primary: "bg-emperor-primary text-black hover:bg-emperor-primaryStrong",
    secondary: "bg-emperor-surfaceStrong text-emperor-text hover:bg-emperor-surface",
    subtle: "bg-transparent text-emperor-text hover:bg-emperor-surface",
    danger: "bg-emperor-danger text-white hover:bg-red-600"
  };

  const sizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-2",
    lg: "px-4 py-3 text-lg"
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
