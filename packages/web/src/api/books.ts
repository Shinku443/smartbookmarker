// apps/web/src/api/books.ts

export type BookDto = {
  id: string;
  title: string;
  emoji: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

const BASE = "/api/books";

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBooks(): Promise<BookDto[]> {
  const res = await fetch(BASE, { method: "GET" });
  return handleJson<BookDto[]>(res);
}

export async function createBook(input: {
  title: string;
  emoji?: string | null;
}): Promise<BookDto> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleJson<BookDto>(res);
}

export async function updateBook(
  id: string,
  input: Partial<{
    title: string;
    emoji: string | null;
    order: number;
  }>
): Promise<BookDto> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleJson<BookDto>(res);
}

export async function deleteBook(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with ${res.status}`);
  }
}