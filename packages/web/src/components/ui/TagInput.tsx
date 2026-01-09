import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * TagInput.tsx
 * -------------
 * An advanced tag input component with chip display and multiple separators.
 *
 * Features:
 *   - Chip-based tag display with delete buttons
 *   - Multiple separators: comma, semicolon, space
 *   - Backspace to delete last tag
 *   - Enter to confirm input
 *   - Customizable placeholder and styling
 */

type TagInputProps = {
  /** Current array of tag labels */
  value: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** Placeholder text for input */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
};

export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder = "Add tags (comma, semicolon, or space separated)",
  className = ""
}) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Process input and create tags
  const processInput = (text: string) => {
    if (!text.trim()) return;

    // Split by comma, semicolon, or space
    const separators = /[;, ]+/;
    const newTags = text
      .split(separators)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0 && !value.includes(tag));

    if (newTags.length > 0) {
      onChange([...value, ...newTags]);
      setInputValue("");
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processInput(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Delete last tag on backspace when input is empty
      onChange(value.slice(0, -1));
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Auto-process if ends with separator
    if (newValue.endsWith(",") || newValue.endsWith(";") || newValue.endsWith(" ")) {
      processInput(newValue.slice(0, -1));
    }
  };

  // Remove a specific tag
  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  // Focus input when clicking on container
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className={`border border-emperor-border rounded-lg p-3 bg-emperor-surface focus-within:border-emperor-accent transition-colors ${className}`}
      onClick={handleContainerClick}
    >
      {/* Tag chips */}
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-emperor-accent text-white text-xs rounded-full"
          >
            #{tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
              title={`Remove ${tag}`}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ""}
        className="w-full bg-transparent border-none outline-none text-sm text-emperor-text placeholder-emperor-muted"
      />
    </div>
  );
};