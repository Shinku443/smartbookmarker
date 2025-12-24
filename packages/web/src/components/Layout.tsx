export default function Layout({ sidebar, children }: any) {
  return (
    <div className="min-h-screen bg-emperor-bg text-emperor-text p-6 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-[280px_1fr] gap-6">
        {sidebar}
        <main>{children}</main>
      </div>
    </div>
  );
}