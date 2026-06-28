"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listZones } from "@/lib/api";
import { Globe, Activity, GitBranch, Network, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [zoneCount, setZoneCount] = useState<number | null>(null);
  useEffect(() => { listZones({}).then(r => setZoneCount(r.data.total)).catch(() => {}); }, []);

  const cards = [
    { label: "Hosted zones", value: zoneCount ?? "—", icon: Globe, href: "/hosted-zones", color: "#0073BB" },
    { label: "Health checks", value: "0", icon: Activity, href: "/health-checks", color: "#1D8102" },
    { label: "Traffic policies", value: "0", icon: GitBranch, href: "/traffic-policies", color: "#6B48FF" },
    { label: "Resolver endpoints", value: "0", icon: Network, href: "/resolver", color: "#E88000" },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="breadcrumb">Route 53</div>
        <h1 className="page-title">Dashboard</h1>
      </div>
      <div style={{ padding: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          {cards.map(({ label, value, icon: Icon, href, color }) => (
            <div key={label} className="aws-panel" style={{ padding: 20, cursor: "pointer" }} onClick={() => router.push(href)}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 300, color }}>{value}</div>
                  <div style={{ fontSize: 13, color: "#545B64", marginTop: 4 }}>{label}</div>
                </div>
                <Icon size={28} style={{ color, opacity: 0.2 }} />
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#0073BB", display: "flex", alignItems: "center", gap: 4 }}>
                View all <ArrowRight size={11} />
              </div>
            </div>
          ))}
        </div>
        <div className="aws-panel" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Getting started with Route 53</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { step: "1", title: "Create a hosted zone", desc: "A hosted zone is a container for DNS records for a domain.", href: "/hosted-zones" },
              { step: "2", title: "Add DNS records", desc: "Create A, CNAME, MX, and other record types to route traffic.", href: "/hosted-zones" },
              { step: "3", title: "Configure health checks", desc: "Monitor endpoints and route traffic based on health.", href: "/health-checks" },
              { step: "4", title: "Set up traffic policies", desc: "Route traffic based on latency, weight, or geolocation.", href: "/traffic-policies" },
            ].map(({ step, title, desc, href }) => (
              <div key={step} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--aws-border)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0073BB", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{step}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#0073BB", cursor: "pointer" }} onClick={() => router.push(href)}>{title}</div>
                  <div style={{ fontSize: 12, color: "#545B64", marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
