"use client";
import { Construction } from "lucide-react";

export default function PlaceholderPage() {
  return (
    <div>
      <div className="page-header">
        <div className="breadcrumb">Route 53</div>
        <h1 className="page-title">Health Checks</h1>
      </div>
      <div style={{ padding: 24 }}>
        <div className="aws-panel">
          <div className="coming-soon" style={{ padding: "80px 40px" }}>
            <Construction size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <h2>Health Checks</h2>
            <p style={{ maxWidth: 460 }}>Monitor the health of your resources and route traffic based on endpoint availability and response times.</p>
            <p style={{ marginTop: 16, fontSize: 12, color: "#8d9098" }}>This section is not yet implemented. Full DNS management is available in Hosted Zones.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
