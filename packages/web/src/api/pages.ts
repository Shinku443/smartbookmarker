export type PageDto = {
  id: string;
  bookId: string | null;
  title: string;
  content: string | null;
  url: string | null;

  // Enhanced content fields
  description?: string | null;
  faviconUrl?: string | null;
  thumbnailUrl?: string | null;
  extractedText?: string | null;
  screenshotUrl?: string | null;
  metaDescription?: string | null;

  // Status management
  status?: string | null;

  // Personal notes
  notes?: string | null;

  // Metadata
  source: string;
  rawMetadata?: any;

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
  bookId?: string | null;
  title: string;
  content?: string | null;
  url?: string;
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

// Enhanced API methods for content extraction and status management
export async function createPageWithUrl(input: {
  bookId: string;
  title: string;
  url: string;
  status?: string;
  notes?: string;
}): Promise<PageDto> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleJson<PageDto>(res);
}

export async function extractPageContent(id: string, url: string): Promise<PageDto> {
  const res = await fetch(`${BASE}/${id}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return handleJson<PageDto>(res);
}

export async function updatePageStatus(id: string, status: string): Promise<PageDto> {
  const res = await fetch(`${BASE}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return handleJson<PageDto>(res);
}

export async function updatePageNotes(id: string, notes: string): Promise<PageDto> {
  const res = await fetch(`${BASE}/${id}/notes`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  return handleJson<PageDto>(res);
}

export async function updatePageEnhanced(
  id: string,
  input: Partial<{
    title: string;
    content: string | null;
    order: number;
    pinned: boolean;
    status: string;
    notes: string;
    description: string;
    faviconUrl: string;
    thumbnailUrl: string;
    extractedText: string;
    screenshotUrl: string;
    metaDescription: string;
  }>
): Promise<PageDto> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleJson<PageDto>(res);
}