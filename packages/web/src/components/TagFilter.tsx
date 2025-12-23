export default function TagFilter({ tags, activeTag, setActiveTag }: any) {
  return (
    <div>
      <button
        onClick={() => setActiveTag(null)}
        style={{
          padding: "3px 8px",
          marginRight: 6,
          background: activeTag === null ? "#111" : "#eee",
          color: activeTag === null ? "#fff" : "#111"
        }}
      >
        All
      </button>

      {tags.map((tag: string) => (
        <button
          key={tag}
          onClick={() => setActiveTag(tag === activeTag ? null : tag)}
          style={{
            padding: "3px 8px",
            marginRight: 6,
            background: activeTag === tag ? "#111" : "#eee",
            color: activeTag === tag ? "#fff" : "#111"
          }}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}