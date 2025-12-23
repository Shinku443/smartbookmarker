import AddBookmarkForm from "./AddBookmarkForm";
import SearchBar from "./SearchBar";
import TagFilter from "./TagFilter";

export default function Sidebar({
  onAdd,
  search,
  setSearch,
  tags,
  activeTag,
  setActiveTag,
  onImport,
  onExport
}: any) {
  return (
    <aside style={{ background: "#fff", padding: 16, borderRadius: 12 }}>
      <h1>Emperor Bookmarking</h1>

      <h3>Add Bookmark</h3>
      <AddBookmarkForm onAdd={onAdd} />

      <h3>Import / Export</h3>
      <input type="file" accept=".html,.htm" onChange={onImport} />
      <button onClick={onExport} style={{ marginTop: 6 }}>
        Export JSON
      </button>

      <h3>Search</h3>
      <SearchBar value={search} onChange={setSearch} />

      <h3>Tags</h3>
      <TagFilter tags={tags} activeTag={activeTag} setActiveTag={setActiveTag} />
    </aside>
  );
}