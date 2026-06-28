"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(username, password);
      localStorage.setItem("token", res.data.access_token);
      router.push("/hosted-zones");
    } catch {
      toast.error("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#232F3E",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      {/* AWS-style top bar on login */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 40, background: "#161E2D", borderBottom: "2px solid #FF9900", display: "flex", alignItems: "center", padding: "0 24px" }}>
        <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Amazon Web Services</span>
      </div>

      <div style={{ width: "100%", maxWidth: 380, marginTop: 40 }}>
        {/* Card */}
        <div style={{ background: "white", borderRadius: 2, padding: "32px 32px 24px", boxShadow: "0 1px 10px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌐</div>
            <h1 style={{ fontSize: 20, fontWeight: 400, margin: "0 0 4px", color: "#16191F" }}>Sign in</h1>
            <p style={{ fontSize: 13, color: "#545B64", margin: 0 }}>AWS Management Console</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="aws-label">Username</label>
              <input
                className="aws-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label className="aws-label">Password</label>
              <input
                className="aws-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "10px 16px", marginTop: 8 }}
            >
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Signing in…</> : "Sign in"}
            </button>
          </form>

          <div style={{ marginTop: 16, padding: "10px 12px", background: "#f2f3f3", borderRadius: 2, fontSize: 12, color: "#545B64" }}>
            <strong>Demo credentials:</strong><br />
            Username: <code>admin</code> &nbsp; Password: <code>admin123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
