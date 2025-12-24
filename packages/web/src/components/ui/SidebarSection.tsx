import React from "react";

export type SidebarSectionProps = {
  title?: string;
  children: React.ReactNode;
};

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="mb-6 px-4">
      {title && (
        <h3 className="text-emperor-muted text-sm uppercase tracking-wide mb-2">
          {title}
        </h3>
      )}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}