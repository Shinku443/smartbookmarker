import React from "react";

/**
 * SidebarSection.tsx
 * ------------------
 * A layout component for organizing content within the sidebar.
 * Now supports ref forwarding for scroll anchoring, measurement,
 * keyboard navigation, and future collapsible/animated sections.
 */

export type SidebarSectionProps = {
  /** Optional title for the section */
  title?: string;

  /** Child elements to render within the section */
  children: React.ReactNode;

  /** Optional className passthrough */
  className?: string;
};

export const SidebarSection = React.forwardRef<
  HTMLDivElement,
  SidebarSectionProps
>(function SidebarSection({ title, children, className }, ref) {
  return (
    <div ref={ref} className={`mb-6 px-4 ${className ?? ""}`}>
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
});

SidebarSection.displayName = "SidebarSection";