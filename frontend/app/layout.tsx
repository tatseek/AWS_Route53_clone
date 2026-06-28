"use client";
import "./globals.css";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getMe } from "@/lib/api";
import { Toaster } from "react-hot-toast";
import {
  Globe, Shield, Activity, GitBranch, Settings, ChevronRight,
  LogOut, Menu, X, User, Database, Network
} from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: Database },
  { label: "Hosted zones", href: "/hosted-zones", icon: Globe },
  { label: "Health checks", href: "/health-checks", icon: Activity },
  { label: "Traffic policies", href: "/traffic-policies", icon: GitBranch },
  { label: "Resolver", href: "/resolver", icon: Network },
  { label: "Profiles", href: "/profiles", icon: Settings },
];

function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <aside style={{
      width: collapsed ? 48 : 220,
      background: "var(--aws-sidebar)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      transition: "width 0.2s",
      overflow: "hidden",
      minHeight: "100%",
    }}>
      <div style={{ padding: "12px 8px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", cursor: "pointer", color: "white", padding: "4px", display: "flex", borderRadius: 2 }}>
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
        {!collapsed && <span style={{ color: "white", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>Route 53</span>}
      </div>
      {!collapsed && (
        <div style={{ padding: "8px 12px 4px", fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>
          DNS Management
        </div>
      )}
      <nav style={{ flex: 1, paddingTop: 4 }}>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: collapsed ? "10px 14px" : "9px 12px",
              background: active ? "var(--aws-sidebar-active)" : "transparent",
              color: active ? "white" : "rgba(255,255,255,0.75)",
              textDecoration: "none", fontSize: 13,
              borderLeft: active ? "3px solid #FF9900" : "3px solid transparent",
              whiteSpace: "nowrap",
            }} title={collapsed ? label : undefined}>
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <ChevronRight size={12} style={{ marginLeft: "auto", opacity: 0.6 }} />}
            </Link>
          );
        })}
      </nav>
      <button onClick={handleLogout} title={collapsed ? "Sign out" : undefined} style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: collapsed ? "10px 14px" : "10px 12px",
        background: "none", border: "none", cursor: "pointer",
        color: "rgba(255,255,255,0.6)", fontSize: 13,
        borderTop: "1px solid rgba(255,255,255,0.1)", width: "100%", whiteSpace: "nowrap",
      }}>
        <LogOut size={16} style={{ flexShrink: 0 }} />
        {!collapsed && <span>Sign out</span>}
      </button>
    </aside>
  );
}

function TopBar({ username }: { username: string }) {
  return (
    <header style={{
      height: 40, background: "var(--aws-blue)", display: "flex", alignItems: "center",
      padding: "0 16px", gap: 16, borderBottom: "2px solid var(--aws-orange)",
      position: "sticky", top: 0, zIndex: 20, flexShrink: 0,
    }}>
      <span style={{ color: "white", fontSize: 13, fontWeight: 700, marginRight: "auto" }}>AWS Management Console</span>
      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
        <User size={13} /> {username}
      </span>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>us-east-1</span>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const isAuthPage = pathname === "/login";

  useEffect(() => {
    if (!isAuthPage) {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }
      getMe().then(r => setUsername(r.data.username)).catch(() => router.push("/login"));
    }
  }, [pathname]);

  if (isAuthPage) {
    return (
      <html lang="en">
        <head><title>AWS Route 53</title></head>
        <body>{children}<Toaster position="top-right" /></body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head><title>AWS Route 53</title></head>
      <body style={{ margin: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <TopBar username={username} />
          <div style={{ display: "flex", flex: 1 }}>
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <main style={{ flex: 1, minWidth: 0, background: "var(--aws-bg)" }}>{children}</main>
          </div>
        </div>
        <Toaster position="top-right" toastOptions={{ style: { fontSize: 13, borderRadius: 2 } }} />
      </body>
    </html>
  );
}
