Write-Host "=== Generating Emperor Sidebar with Icons ===" -ForegroundColor Cyan

$components = "packages/web/src/components"
$ui = "$components/ui"

if (-not (Test-Path $components)) {
  New-Item -ItemType Directory -Path $components | Out-Null
}

# -----------------------------
# Sidebar.tsx
# -----------------------------
Set-Content "$components/Sidebar.tsx" @"
import { SidebarSection } from "./ui/SidebarSection";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import {
  HomeIcon,
  TagIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  StarIcon
} from "@heroicons/react/24/outline";

export default function Sidebar({
  onAdd,
  search,
  setSearch,
  tags,
  activeTag,
  setActiveTag,
  onImport,
  onExport,
  onOpenSettings
}: any) {
  return (
    <aside className="bg-emperor-surface rounded-card p-4 border border-emperor-border w-64">
      <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
        <StarIcon className="w-6 h-6 text-emperor-primary" />
        Emperor
      </h1>

      <SidebarSection title="Navigation">
        <nav className="flex flex-col gap-2">
          <button className="flex items-center gap-2 text-emperor-text hover:text-emperor-primary">
            <HomeIcon className="w-5 h-5" />
            Home
          </button>

          <button className="flex items-center gap-2 text-emperor-text hover:text-emperor-primary">
            <StarIcon className="w-5 h-5" />
            Pinned
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 text-emperor-text hover:text-emperor-primary"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            Settings
          </button>
        </nav>
      </SidebarSection>

      <SidebarSection title="Add Bookmark">
        <Button
          onClick={() => onAdd(prompt("Title")!, prompt("URL")!)}
          className="w-full flex items-center gap-2"
        >
          <PlusCircleIcon className="w-5 h-5" />
          Add Bookmark
        </Button>
      </SidebarSection>

      <SidebarSection title="Search">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SidebarSection>

      <SidebarSection title="Tags">
        <div className="flex flex-col gap-1">
          {tags.map((tag: string) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={\`flex items-center gap-2 px-2 py-1 rounded-card \${activeTag === tag
                ? "bg-emperor-primary text-black"
                : "text-emperor-text hover:bg-emperor-surfaceStrong"}\`}
            >
              <TagIcon className="w-4 h-4" />
              #{tag}
            </button>
          ))}
        </div>
      </SidebarSection>

      <SidebarSection title="Import / Export">
        <input
          type="file"
          accept=".html,.htm"
          onChange={onImport}
          className="text-sm mb-2"
        />
        <Button variant="secondary" onClick={onExport} className="w-full">
          Export JSON
        </Button>
      </SidebarSection>
    </aside>
  );
}
"@

Write-Host "=== Sidebar Generated Successfully ===" -ForegroundColor Green