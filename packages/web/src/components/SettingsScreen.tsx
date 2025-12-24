import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { ThemeMode } from "../hooks/useTheme";

type SettingsProps = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  editMode: "modal" | "inline";
  setEditMode: (m: "modal" | "inline") => void;
};

export default function SettingsScreen({
  theme,
  setTheme,
  editMode,
  setEditMode
}: SettingsProps) {
  return (
    <Card className="max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>

      <div className="space-y-4">
        {/* Theme */}
        <div>
          <label className="block text-sm mb-1">Theme</label>
          <select
            className="bg-emperor-surfaceStrong border border-emperor-border rounded-card px-3 py-2 w-full"
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeMode)}
          >
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        {/* Edit Mode */}
        <div>
          <label className="block text-sm mb-1">Edit mode</label>
          <select
            className="bg-emperor-surfaceStrong border border-emperor-border rounded-card px-3 py-2 w-full"
            value={editMode}
            onChange={(e) => setEditMode(e.target.value as "modal" | "inline")}
          >
            <option value="modal">Modal (recommended)</option>
            <option value="inline">Inline</option>
          </select>
        </div>

        {/* Backup / Restore */}
        <div>
          <label className="block text-sm mb-1">Backup / Restore</label>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1">
              Download JSON
            </Button>
            <Input type="file" className="flex-1" />
          </div>
        </div>
      </div>
    </Card>
  );
}
