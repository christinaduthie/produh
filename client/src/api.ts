const BASE = import.meta.env.VITE_API_BASE;


export async function api(path: string, body?: any){
const res = await fetch(`${BASE}${path}`,{
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: body ? JSON.stringify(body) : undefined
});
if (!res.ok) throw new Error(await res.text());
return res.json();
}


export async function get<T>(path: string): Promise<T>{
const res = await fetch(`${BASE}${path}`);
if (!res.ok) throw new Error(await res.text());
return res.json();
}