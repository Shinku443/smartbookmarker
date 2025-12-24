export const API_URL = "http://localhost:4000";

export async function apiGet(path: string) {
  const res = await fetch(\\\\);
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(\\\\, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}
