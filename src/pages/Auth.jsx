import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ft, blue, blueDeep, bg } from "../shared/tokens";
import { authClient } from "../shared/auth";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | register
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("smb");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const { error: err } = await authClient.signUp.email({
          name,
          email,
          password,
          role,
        });
        if (err) {
          setError(err.message || "Registration failed");
          setLoading(false);
          return;
        }
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
        });
        if (err) {
          setError(err.message || "Login failed");
          setLoading(false);
          return;
        }
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    fontFamily: ft.sans,
    fontSize: 14,
    color: "#E3F2FD",
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(66,165,245,.12)",
    borderRadius: 10,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontFamily: ft.mono,
    fontSize: 10,
    fontWeight: 700,
    color: "rgba(255,255,255,.3)",
    letterSpacing: ".08em",
    textTransform: "uppercase",
    marginBottom: 6,
    display: "block",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "rgba(255,255,255,.02)",
          border: "1px solid rgba(66,165,245,.08)",
          borderRadius: 18,
          padding: 32,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${blueDeep}, ${blue})`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
              <path d="M16 3 L5 19 L11 19 L16 11 L21 19 L27 19Z" fill="#fff" opacity=".85" />
              <path d="M16 12 L10 20.5 L16 29 L22 20.5Z" fill="#90CAF9" opacity=".6" />
            </svg>
          </div>
          <h1 style={{ fontFamily: ft.display, fontSize: 22, fontWeight: 700, margin: 0 }}>
            agentic<span style={{ color: blue }}>proxies</span>
          </h1>
          <p
            style={{
              fontFamily: ft.mono,
              fontSize: 10,
              color: "rgba(255,255,255,.25)",
              marginTop: 6,
              letterSpacing: ".08em",
            }}
          >
            {mode === "login" ? "SIGN IN TO YOUR ACCOUNT" : "CREATE YOUR ACCOUNT"}
          </p>
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: "flex",
            background: "rgba(255,255,255,.03)",
            borderRadius: 8,
            padding: 3,
            marginBottom: 24,
          }}
        >
          {["login", "register"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                fontFamily: ft.mono,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: mode === m ? "rgba(66,165,245,.1)" : "transparent",
                color: mode === m ? blue : "rgba(255,255,255,.3)",
              }}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: mode === "register" ? 16 : 24 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={inputStyle}
            />
          </div>

          {mode === "register" && (
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Account Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { value: "smb", label: "SMB", desc: "I need SEO/AIO services" },
                  { value: "builder", label: "Builder", desc: "I build AI agents" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    style={{
                      flex: 1,
                      padding: "12px 10px",
                      background: role === opt.value ? "rgba(66,165,245,.08)" : "rgba(255,255,255,.02)",
                      border: `1px solid ${role === opt.value ? "rgba(66,165,245,.25)" : "rgba(255,255,255,.06)"}`,
                      borderRadius: 10,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: ft.mono,
                        fontSize: 11,
                        fontWeight: 700,
                        color: role === opt.value ? blue : "rgba(255,255,255,.5)",
                        marginBottom: 2,
                      }}
                    >
                      {opt.label}
                    </div>
                    <div style={{ fontFamily: ft.sans, fontSize: 11, color: "rgba(255,255,255,.25)" }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                fontFamily: ft.mono,
                fontSize: 11,
                color: "#EF5350",
                background: "rgba(239,83,80,.08)",
                border: "1px solid rgba(239,83,80,.15)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              fontFamily: ft.mono,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "#fff",
              background: `linear-gradient(135deg, ${blueDeep}, ${blue})`,
              border: "none",
              borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
