import React from "react";

/**
 * SidebarSection.tsx
 * ------------------
 * A layout component for organizing content within the sidebar.
 * Provides consistent spacing and optional section titles.
 * Used to group related sidebar elements like books, tags, etc.
 */

/**
 * SidebarSectionProps Interface
 * -----------------------------
 * Defines the properties for the SidebarSection component.
 */
export type SidebarSectionProps = {
  /** Optional title for the section */
  title?: string;
  /** Child elements to render within the section */
  children: React.ReactNode;
};

/**
 * SidebarSection Component
 * ------------------------
 * Renders a section container with optional title and consistent spacing.
 * Applies sidebar-specific styling and layout for grouped content.
 *
 * @param props - The section props
 * @returns JSX element for the sidebar section
 */
export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="mb-6 px-4">
      {/* Optional section title */}
      {title && (
        <h3 className="text-emperor-muted text-sm uppercase tracking-wide mb-2">
          {title}
        </h3>
      )}
      {/* Container for child elements with vertical spacing */}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}