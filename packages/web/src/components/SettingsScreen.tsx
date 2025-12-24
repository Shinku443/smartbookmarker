import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { ThemeMode } from "../hooks/useTheme";

/**
 * SettingsScreen.tsx
 * ------------------
 * The settings screen component for application configuration.
 * Provides options for theme selection, edit mode preference, and data backup/restore.
 * Accessible through the sidebar settings button.
 */

/**
 * SettingsProps Interface
 * -----------------------
 * Defines the properties for the SettingsScreen component.
 */
type SettingsProps = {
  /** Current theme mode */
  theme: ThemeMode;
  /** Function to update theme mode */
  setTheme: (t: ThemeMode) => void;
  /** Current edit mode preference */
  editMode: "modal" | "inline";
  /** Function to update edit mode preference */
  setEditMode: (m: "modal" | "inline") => void;
};

/**
 * SettingsScreen Component
 * ------------------------
 * Renders the application settings interface with theme and edit mode controls.
 * Also includes placeholder for backup/restore functionality.
 *
 * @param props - The component props
 * @returns JSX element for the settings screen
 */
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
        {/* Theme selection */}
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

        {/* Edit mode preference */}
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

        {/* Backup/Restore section - placeholder for future implementation */}
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
