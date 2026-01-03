# Ensure we're in the repo root
Set-Location (Split-Path $MyInvocation.MyCommand.Path)

Write-Host "=== Generating Emperor UI Primitives ===" -ForegroundColor Cyan

$uiRoot = "packages/web/src/components/ui"

# Create folder
if (-not (Test-Path $uiRoot)) {
    New-Item -ItemType Directory -Path $uiRoot | Out-Null
    Write-Host "Created folder: $uiRoot"
}

# -----------------------------
# Button.tsx
# -----------------------------
$button = @"
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
"@

Set-Content -Path "$uiRoot/Button.tsx" -Value $button
Write-Host "Created Button.tsx"

# -----------------------------
# Card.tsx
# -----------------------------
$card = @"
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
"@

Set-Content -Path "$uiRoot/Card.tsx" -Value $card
Write-Host "Created Card.tsx"

# -----------------------------
# Input.tsx
# -----------------------------
$input = @"
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
"@

Set-Content -Path "$uiRoot/Input.tsx" -Value $input
Write-Host "Created Input.tsx"

# -----------------------------
# TagChip.tsx
# -----------------------------
$tagchip = @"
import React from "react";
import clsx from "clsx";

type TagChipProps = {
  label: string;
  onRemove?: () => void;
};

export function TagChip({ label, onRemove }: TagChipProps) {
  return (
    <span className="inline-flex items-center bg-emperor-surfaceStrong text-emperor-text px-2 py-1 rounded-pill text-sm mr-2">
      #{label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 text-emperor-muted hover:text-emperor-text"
        >
          ×
        </button>
      )}
    </span>
  );
}
"@

Set-Content -Path "$uiRoot/TagChip.tsx" -Value $tagchip
Write-Host "Created TagChip.tsx"

# -----------------------------
# SidebarSection.tsx
# -----------------------------
$sidebar = @"
import React from "react";

export function SidebarSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-emperor-muted text-sm uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}
"@

Set-Content -Path "$uiRoot/SidebarSection.tsx" -Value $sidebar
Write-Host "Created SidebarSection.tsx"

Write-Host "`n=== UI Primitives Generated Successfully ===" -ForegroundColor Green