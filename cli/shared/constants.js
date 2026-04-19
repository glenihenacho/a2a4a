export const SCAN_PHASES = [
  { id: "pull", label: "Pulling image" },
  { id: "inspect", label: "Inspecting container" },
  { id: "manifest", label: "Parsing manifest" },
  { id: "capabilities", label: "Discovering capabilities" },
  { id: "schemas", label: "Inferring I/O schemas" },
  { id: "tools", label: "Detecting tool dependencies" },
  { id: "sla", label: "Benchmarking SLA" },
  { id: "policy", label: "Policy compliance scan" },
  { id: "eval", label: "Extracting eval claims" },
  { id: "wrap", label: "Wrapping agent" },
];

export const WRAPPER_SPEC = {
  input: [
    { field: "intent", type: "IntentSpec", desc: "Target query, vertical, goals, success criteria" },
    { field: "constraints", type: "Constraints", desc: "Budget cap, time limit, geo scope, compliance rules" },
    { field: "context_pack", type: "ContextPack", desc: "Prior artifacts, competitor data, account history" },
    { field: "allowed_tools", type: "ToolRef[]", desc: "Allowlisted tool IDs the agent may invoke" },
    { field: "budget", type: "BudgetEnvelope", desc: "Hard ceiling with per-tool sub-allocations" },
  ],
  output: [
    { field: "artifacts[]", type: "Artifact[]", desc: "Reports, code, content, schema deployments" },
    { field: "metrics", type: "RunMetrics", desc: "Latency, cost breakdown, quality signals" },
    { field: "receipts[]", type: "Receipt[]", desc: "Cryptographic proof of each tool invocation" },
    { field: "status", type: "RunStatus", desc: "completed | failed | checkpoint | cancelled" },
    { field: "traces", type: "TraceLog", desc: "Deterministic trace for replay and audit" },
  ],
  responsibilities: [
    { label: "Format Translation", desc: "Marketplace job → agent-native format", icon: "⟐" },
    { label: "Budget Enforcement", desc: "Hard caps on spend + per-tool sub-limits", icon: "◈" },
    { label: "Tool Allowlist", desc: "Proxy layer restricting tool access", icon: "⊡" },
    { label: "Structured Telemetry", desc: "Real-time events for monitoring & billing", icon: "◉" },
    { label: "Checkpointing", desc: "Deterministic resume points for retry", icon: "⊞" },
    { label: "Artifact Schema", desc: "Outputs conform to standard RunResult", icon: "⬡" },
  ],
};

export const PIPELINE_STAGES = [
  { label: "Image Pulled", desc: "Container downloaded and verified" },
  { label: "Manifest Inferred", desc: "Capabilities, schemas, tools auto-discovered" },
  { label: "Wrapper Integrated", desc: "Sandbox provisioned, telemetry connected" },
  { label: "Sandbox Testing", desc: "Test JobSpecs validate end-to-end I/O" },
  { label: "Evaluation Run", desc: "Benchmark jobs verify claimed metrics" },
  { label: "Review & Approval", desc: "Compliance, telemetry, threshold checks" },
  { label: "Live on Marketplace", desc: "Published, routable, monitored" },
];

export const STATUS_CFG = {
  bidding: { label: "Bidding", color: "#FFA726", bg: "rgba(255,167,38,.1)" },
  engaged: { label: "Engaged", color: "#42A5F5", bg: "rgba(66,165,245,.1)" },
  milestone: { label: "In Progress", color: "#64B5F6", bg: "rgba(100,181,246,.1)" },
  completed: { label: "Completed", color: "#78909C", bg: "rgba(120,144,156,.1)" },
};

export const MALWARE_PATTERNS = [
  { id: "crypto_miner", pattern: /stratum\+tcp|xmrig|coinhive|cryptonight|minerd/i, severity: "critical", desc: "Cryptocurrency mining" },
  { id: "reverse_shell", pattern: /\/bin\/(?:ba)?sh\s+-i|nc\s+-[el]|ncat\s+-[el]|socat\s+exec|python.*pty\.spawn/i, severity: "critical", desc: "Reverse shell" },
  { id: "data_exfil", pattern: /curl\s+.*-d\s+@|wget\s+--post-file|base64.*\|\s*curl/i, severity: "critical", desc: "Data exfiltration" },
  { id: "obfuscated_exec", pattern: /eval\s*\(\s*(?:compile|exec|__import__)\s*\(|exec\s*\(\s*base64\.b64decode/i, severity: "high", desc: "Obfuscated code execution" },
  { id: "unauthorized_binary", pattern: /subprocess\.(?:call|run|Popen)\s*\(\s*\[?\s*["'](?:chmod|chown|mount|mkfs|dd|fdisk)/i, severity: "high", desc: "Unauthorized binary execution" },
  { id: "suspicious_network", pattern: /socket\.socket\s*\(.*SOCK_RAW|scapy|raw_socket|pcap/i, severity: "high", desc: "Raw socket / packet capture" },
  { id: "credential_harvest", pattern: /\/etc\/(?:shadow|passwd)|\.ssh\/|\.aws\/credentials|\.env\b/i, severity: "high", desc: "Credential file access" },
  { id: "kernel_module", pattern: /insmod|modprobe|rmmod|\/dev\/kmem/i, severity: "critical", desc: "Kernel module manipulation" },
];

export const ALLOWED_NETWORK_PATTERNS = [
  /^https?:\/\//,
  /dns\.resolve/,
  /fetch\s*\(/,
  /requests\.(get|post|put|delete|patch|head)\s*\(/,
  /aiohttp/,
  /httpx/,
];
