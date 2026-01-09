import React, { useState } from "react";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { TagInput } from "./ui/TagInput";

/**
 * AddBookmarkForm.tsx
 * -------------------
 * A modal form component for adding new bookmarks to the library.
 * Provides input fields for title, URL, and tags, with validation and submission handling.
 * This form is used within modals to collect bookmark data from users.
 */

/**
 * Props Interface
 * ---------------
 * Defines the properties for the AddBookmarkForm component.
 */
type Props = {
  /** Callback function to add the bookmark with provided data */
  onAdd: (title: string, url: string, tags: string[]) => void;
  /** Callback function to close the modal/form */
  onClose: () => void;
};

/**
 * AddBookmarkForm Component
 * -------------------------
 * Renders a modal overlay with a form for creating new bookmarks.
 * Manages local state for form inputs and handles form submission.
 *
 * @param props - The component props
 * @returns JSX element for the bookmark addition form
 */
export default function AddBookmarkForm({ onAdd, onClose }: Props) {
  // Local state for form inputs
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  /**
   * handleAdd
   * ----------
   * Processes the form submission by calling the onAdd callback with current tags.
   * After adding the bookmark, the modal is closed.
   */
  function handleAdd() {
    // Add the bookmark and close the form
    onAdd(title, url, tags);
    onClose();
  }

  return (
    // Modal overlay with backdrop
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-emperor-surfaceStrong p-6">
        <h2 className="text-lg font-semibold mb-4">Add Bookmark</h2>

        {/* Form fields container */}
        <div className="space-y-4">
          {/* Title input field */}
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Favorite Site"
            />
          </div>

          {/* URL input field */}
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Tags input field */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tags
            </label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add tags (comma, semicolon, or space separated)"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add</Button>
        </div>
      </Card>
    </div>
  );
}
