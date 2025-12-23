export default function SearchBar({ value, onChange }: any) {
  return (
    <input
      placeholder="Search title, URL, tags…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: 6 }}
    />
  );
}