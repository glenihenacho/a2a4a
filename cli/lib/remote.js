import { loadToken } from "./session.js";

const DEFAULT_BASE = "http://localhost:3001";

function getBase() {
  return process.env.AP_API_URL || DEFAULT_BASE;
}

export async function request(method, path, body, opts = {}) {
  const base = getBase();
  const token = loadToken();
  const headers = {};

  if (token?.token) {
    headers["Authorization"] = `Bearer ${token.token}`;
  }
  if (body && !opts.raw) {
    headers["Content-Type"] = "application/json";
  }

  const fetchOpts = {
    method,
    headers: { ...headers, ...opts.headers },
    body: body ? (opts.raw ? body : JSON.stringify(body)) : undefined,
  };

  const res = await fetch(`${base}${path}`, fetchOpts);

  if (!res.ok) {
    const text = await res.text();
    let msg;
    try {
      const data = JSON.parse(text);
      msg = data.error || data.message || text;
    } catch {
      msg = text;
    }
    const err = new Error(`${res.status} ${msg}`);
    err.status = res.status;
    throw err;
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export const get = (path) => request("GET", path);
export const post = (path, body) => request("POST", path, body);
export const put = (path, body) => request("PUT", path, body);
export const del = (path) => request("DELETE", path);
