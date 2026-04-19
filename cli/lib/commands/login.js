import { post } from "../remote.js";
import { saveToken } from "../session.js";
import { ok, fail, c } from "../output.js";

export async function run(positional) {
  const [email, password] = positional;
  if (!email || !password) {
    fail("Usage: ap login <email> <password>");
    return;
  }

  const data = await post("/api/cli/token", { email, password });
  saveToken({
    token: data.token,
    email: data.email,
    role: data.role,
    userId: data.userId,
    expiresAt: data.expiresAt,
  });
  ok(`Logged in as ${c.bold}${data.email}${c.reset} (${c.cyan}${data.role}${c.reset})`);
}
