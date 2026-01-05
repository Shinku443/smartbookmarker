// apps/web/src/api/pages.ts

export type PageDto = {
  id: string;
  bookId: string;
  title: string;
  content: string | null;
  order: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

const BASE = "/api/pages";

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchPages(): Promise<PageDto[]> {
  const res = await fetch(BASE, { method: "GET" });
  return handleJson<PageDto[]>(res);
}

export async function createPage(input: {
  bookId: string;
  title: string;
  content?: string | null;
}): Promise<PageDto> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleJson<PageDto>(res);
}

export async function updatePage(
  id: string,
  input: Partial<{
    bookId: string;
    title: string;
    content: string | null;
    order: number;
    pinned: boolean;
  }>
): Promise<PageDto> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleJson<PageDto>(res);
}

export async function deletePage(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with ${res.status}`);
  }
}