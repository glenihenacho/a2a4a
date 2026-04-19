export const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
};

export function ok(msg) {
  console.log(`${c.green}✓${c.reset} ${msg}`);
}

export function warn(msg) {
  console.log(`${c.yellow}⚠${c.reset} ${msg}`);
}

export function fail(msg) {
  console.error(`${c.red}✗${c.reset} ${msg}`);
}

export function info(msg) {
  console.log(`${c.dim}${msg}${c.reset}`);
}

export function heading(msg) {
  console.log(`\n${c.bold}${msg}${c.reset}`);
}

export function json(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function table(rows, columns) {
  if (!rows || rows.length === 0) {
    console.log(`${c.dim}(no results)${c.reset}`);
    return;
  }

  const widths = {};
  for (const col of columns) {
    widths[col.key] = col.label.length;
    for (const row of rows) {
      const val = String(col.fmt ? col.fmt(row[col.key], row) : row[col.key] ?? "");
      widths[col.key] = Math.max(widths[col.key], val.length);
    }
  }

  const header = columns.map((col) => col.label.padEnd(widths[col.key])).join("  ");
  console.log(`${c.bold}${header}${c.reset}`);
  console.log(columns.map((col) => "─".repeat(widths[col.key])).join("──"));

  for (const row of rows) {
    const line = columns
      .map((col) => {
        const raw = row[col.key];
        const val = String(col.fmt ? col.fmt(raw, row) : raw ?? "");
        return val.padEnd(widths[col.key]);
      })
      .join("  ");
    console.log(line);
  }
}

export function statusColor(status) {
  if (status === "live" || status === "completed" || status === "released" || status === "pass") return c.green;
  if (status === "evaluation" || status === "pending" || status === "locked" || status === "warn") return c.yellow;
  if (status === "suspended" || status === "failed" || status === "error" || status === "refunded" || status === "critical") return c.red;
  return c.dim;
}

export function fmtStatus(s) {
  return `${statusColor(s)}${s}${c.reset}`;
}

export function progressBar(current, total, width = 30) {
  const pct = Math.min(current / total, 1);
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const bar = `${"█".repeat(filled)}${"░".repeat(empty)}`;
  const color = pct === 1 ? c.green : c.cyan;
  return `${color}${bar}${c.reset} ${Math.round(pct * 100)}%`;
}

export function phaseHeader(idx, total, label) {
  const num = `[${idx + 1}/${total}]`;
  return `${c.cyan}${num}${c.reset} ${c.bold}${label}${c.reset}`;
}

export function phaseResult(status, msg) {
  const icon = status === "pass" ? `${c.green}✓` : status === "warn" ? `${c.yellow}⚠` : `${c.red}✗`;
  return `  ${icon}${c.reset} ${msg}`;
}

export function spinner(label) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r${c.cyan}${frames[i]}${c.reset} ${label}`);
    i = (i + 1) % frames.length;
  }, 80);

  return {
    stop(finalMsg) {
      clearInterval(interval);
      process.stdout.write(`\r${" ".repeat(label.length + 4)}\r`);
      if (finalMsg) console.log(finalMsg);
    },
  };
}
