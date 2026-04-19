import { clearToken } from "../session.js";
import { ok } from "../output.js";

export async function run() {
  clearToken();
  ok("Session cleared");
}
