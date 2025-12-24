export default function TagFilter({ tags, activeTag, setActiveTag }: any) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setActiveTag(null)}
        className={`px-3 py-1 rounded-pill text-sm ${
          activeTag === null
            ? "bg-emperor-primary text-black"
            : "bg-emperor-surfaceStrong text-emperor-text"
        }`}
      >
        All
      </button>

      {tags.map((tag: string) => (
        <button
          key={tag}
          onClick={() => setActiveTag(tag === activeTag ? null : tag)}
          className={`px-3 py-1 rounded-pill text-sm ${
            activeTag === tag
              ? "bg-emperor-primary text-black"
              : "bg-emperor-surfaceStrong text-emperor-text"
          }`}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}