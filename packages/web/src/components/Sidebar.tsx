import { useState } from "react";
import { SidebarSection } from "./ui/SidebarSection";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import {
  HomeIcon,
  TagIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

type Props = {
  onAdd: (title: string, url: string) => void;
  search: string;
  setSearch: (s: string) => void;
  tags: string[];
  activeTag: string | null;
  setActiveTag: (t: string | null) => void;
  onImport: (e: any) => void;
  onExport: () => void;
  onOpenSettings: () => void;
};

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
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        bg-emperor-surface border border-emperor-border h-full
        flex flex-col relative
        transition-all duration-300 ease-in-out
        ${collapsed ? "w-16" : "w-64"}
      `}
    >
      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 bg-emperor-surfaceStrong border border-emperor-border rounded-full p-1 hover:bg-emperor-surface transition"
      >
        {collapsed ? (
          <ChevronRightIcon className="w-4 h-4" />
        ) : (
          <ChevronLeftIcon className="w-4 h-4" />
        )}
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4">
        <StarIcon className="w-6 h-6 text-emperor-primary" />
        {!collapsed && (
          <h1 className="text-xl font-bold transition-opacity duration-300">
            Emperor
          </h1>
        )}
      </div>

      {/* Navigation */}
      <SidebarSection title={!collapsed ? "Navigation" : undefined}>
        <nav className="flex flex-col gap-2">
          <button className="flex items-center gap-2 text-emperor-text hover:text-emperor-primary px-2 py-1">
            <HomeIcon className="w-5 h-5" />
            {!collapsed && <span>Home</span>}
          </button>

          <button className="flex items-center gap-2 text-emperor-text hover:text-emperor-primary px-2 py-1">
            <StarIcon className="w-5 h-5" />
            {!collapsed && <span>Pinned</span>}
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 text-emperor-text hover:text-emperor-primary px-2 py-1"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            {!collapsed && <span>Settings</span>}
          </button>
        </nav>
      </SidebarSection>

      {/* Add Bookmark */}
      <SidebarSection title={!collapsed ? "Add Bookmark" : undefined}>
        <Button
          onClick={() => {
            const title = prompt("Title");
            const url = prompt("URL");
            if (title && url) onAdd(title, url);
          }}
          className="w-full flex items-center gap-2"
        >
          <PlusCircleIcon className="w-5 h-5" />
          {!collapsed && <span>Add Bookmark</span>}
        </Button>
      </SidebarSection>

      {/* Search */}
      <SidebarSection title={!collapsed ? "Search" : undefined}>
        {!collapsed && (
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </SidebarSection>

      {/* Tags */}
      <SidebarSection title={!collapsed ? "Tags" : undefined}>
        <div className="flex flex-col gap-1">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`flex items-center gap-2 px-2 py-1 rounded-card transition
                ${
                  activeTag === tag
                    ? "bg-emperor-primary text-black"
                    : "text-emperor-text hover:bg-emperor-surfaceStrong"
                }
              `}
            >
              <TagIcon className="w-4 h-4" />
              {!collapsed && <span>#{tag}</span>}
            </button>
          ))}
        </div>
      </SidebarSection>

      {/* Import / Export */}
      <SidebarSection title={!collapsed ? "Import / Export" : undefined}>
        {!collapsed && (
          <>
            <input
              type="file"
              accept=".html,.htm"
              onChange={onImport}
              className="text-sm mb-2"
            />
            <Button variant="secondary" onClick={onExport} className="w-full">
              Export JSON
            </Button>
          </>
        )}
      </SidebarSection>
    </aside>
  );
}