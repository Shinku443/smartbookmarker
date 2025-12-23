import { useState } from "react";

export default function AddBookmarkForm({ onAdd }: { onAdd: (title: string, url: string) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  function submit() {
    if (!title.trim() || !url.trim()) return;
    onAdd(title, url);
    setTitle("");
    setUrl("");
  }

  return (
    <div>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: "100%", padding: 6, marginBottom: 6 }}
      />
      <input
        placeholder="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "100%", padding: 6, marginBottom: 8 }}
      />
      <button onClick={submit} style={{ width: "100%", padding: 6 }}>
        Add Bookmark
      </button>
    </div>
  );
}