export default function Layout({ sidebar, children }: any) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f7",
        padding: 24,
        fontFamily: "system-ui"
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 24
        }}
      >
        {sidebar}
        <main>{children}</main>
      </div>
    </div>
  );
}