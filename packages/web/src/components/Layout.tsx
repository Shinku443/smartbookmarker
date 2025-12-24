/**
 * Layout.tsx
 * -----------
 * The main layout component for the Emperor Library application.
 * Provides a two-column grid layout with a fixed-width sidebar and flexible main content area.
 * Ensures consistent spacing, background, and typography across the application.
 */

/**
 * Layout Component
 * ----------------
 * Renders the application layout with sidebar and main content.
 * Uses CSS Grid for responsive layout with fixed sidebar width.
 *
 * @param sidebar - The sidebar component to render
 * @param children - The main content to render
 * @returns JSX element with the application layout
 */
export default function Layout({ sidebar, children }: any) {
  return (
    <div className="min-h-screen bg-emperor-bg text-emperor-text p-6 font-sans">
      {/* Grid layout: 280px sidebar + flexible main content */}
      <div className="max-w-6xl mx-auto grid grid-cols-[280px_1fr] gap-6">
        {sidebar}
        <main>{children}</main>
      </div>
    </div>
  );
}