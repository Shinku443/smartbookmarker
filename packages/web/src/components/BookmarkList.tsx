import BookmarkCard from "./BookmarkCard";

export default function BookmarkList({ bookmarks, ...actions }: any) {
  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {bookmarks.map((b: any) => (
        <BookmarkCard key={b.id} b={b} {...actions} />
      ))}
    </ul>
  );
}