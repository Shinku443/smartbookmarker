export default function BookmarkCard({
  b,
  onDelete,
  onPin,
  onEdit,
  onRetag
}: any) {
  return (
    <li
      style={{
        padding: 12,
        border: "1px solid #ddd",
        borderRadius: 8,
        marginBottom: 12,
        background: b.pinned ? "#fef3c7" : "#fff"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <img src={b.faviconUrl} width={16} height={16} />
          <div>
            <a href={b.url} target="_blank" rel="noopener noreferrer">
              <strong>{b.title}</strong>
            </a>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>{b.url}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onPin(b.id)}>{b.pinned ? "Unpin" : "Pin"}</button>
          <button onClick={() => onRetag(b.id)}>Retag</button>
          <button onClick={() => onEdit(b)}>Edit</button>
          <button onClick={() => onDelete(b.id)}>Delete</button>
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        {b.tags?.map((t: any) => (
          <span
            key={t.label}
            style={{
              padding: "2px 6px",
              background: "#eee",
              borderRadius: 6,
              marginRight: 6,
              fontSize: "0.8rem"
            }}
          >
            #{t.label}
          </span>
        ))}
      </div>
    </li>
  );
}