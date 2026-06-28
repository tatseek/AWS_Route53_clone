"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { listZones, createZone, deleteZone, updateZone } from "@/lib/api";
import toast from "react-hot-toast";
import { Search, Plus, Trash2, Edit2, RefreshCw, Globe, Info, X } from "lucide-react";

interface Zone {
  id: string; name: string; type: string;
  comment: string; record_count: number; created_at: string;
}

function CreateZoneModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Public");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createZone({ name: name.trim(), type, comment });
      toast.success(`Hosted zone "${name}" created`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create zone");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 className="modal-title">Create hosted zone</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#545B64" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="aws-label">Domain name <span style={{ color: "#D13212" }}>*</span></label>
              <input className="aws-input" value={name} onChange={e => setName(e.target.value)} placeholder="example.com" autoFocus required />
              <p className="aws-label-hint">Enter the name of the domain that you want to route traffic for.</p>
            </div>
            <div className="form-group">
              <label className="aws-label">Type</label>
              <select className="aws-select" style={{ width: "100%" }} value={type} onChange={e => setType(e.target.value)}>
                <option value="Public">Public hosted zone</option>
                <option value="Private">Private hosted zone</option>
              </select>
              <p className="aws-label-hint">
                {type === "Public" ? "Route internet traffic to your resources." : "Route traffic within an Amazon VPC."}
              </p>
            </div>
            <div className="form-group">
              <label className="aws-label">Description (optional)</label>
              <input className="aws-input" value={comment} onChange={e => setComment(e.target.value)} placeholder="A description for this zone" />
            </div>
            <div className="flash flash-info" style={{ marginBottom: 0 }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>AWS Route 53 charges $0.50/month per hosted zone. NS and SOA records are created automatically.</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating…</> : "Create hosted zone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditZoneModal({ zone, onClose, onUpdated }: { zone: Zone; onClose: () => void; onUpdated: () => void }) {
  const [comment, setComment] = useState(zone.comment);
  const [type, setType] = useState(zone.type);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateZone(zone.id, { comment, type });
      toast.success("Hosted zone updated");
      onUpdated();
      onClose();
    } catch { toast.error("Failed to update zone"); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Edit hosted zone</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#545B64" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="aws-label">Domain name</label>
              <input className="aws-input" value={zone.name} disabled style={{ background: "#f2f3f3", color: "#545B64" }} />
            </div>
            <div className="form-group">
              <label className="aws-label">Type</label>
              <select className="aws-select" style={{ width: "100%" }} value={type} onChange={e => setType(e.target.value)}>
                <option value="Public">Public hosted zone</option>
                <option value="Private">Private hosted zone</option>
              </select>
            </div>
            <div className="form-group">
              <label className="aws-label">Description</label>
              <input className="aws-input" value={comment} onChange={e => setComment(e.target.value)} placeholder="Description" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({ zones, onClose, onDeleted }: { zones: Zone[]; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState("");

  const handleDelete = async () => {
    if (confirm !== "delete") return;
    setLoading(true);
    try {
      await Promise.all(zones.map(z => deleteZone(z.id)));
      toast.success(`${zones.length} hosted zone${zones.length > 1 ? "s" : ""} deleted`);
      onDeleted();
      onClose();
    } catch { toast.error("Failed to delete zone(s)"); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: "#D13212" }}>Delete hosted zone{zones.length > 1 ? "s" : ""}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="flash flash-error">
            <Info size={16} style={{ flexShrink: 0 }} />
            <span>
              You are about to delete <strong>{zones.length}</strong> hosted zone{zones.length > 1 ? "s" : ""}. This action cannot be undone.
              All DNS records within these zones will be permanently deleted.
            </span>
          </div>
          <ul style={{ margin: "12px 0", paddingLeft: 20, fontSize: 13 }}>
            {zones.map(z => <li key={z.id} style={{ marginBottom: 4 }}><strong>{z.name}</strong></li>)}
          </ul>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="aws-label">Type <strong>delete</strong> to confirm</label>
            <input className="aws-input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="delete" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete} disabled={confirm !== "delete" || loading}>
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HostedZonesPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const PAGE_SIZE = 20;

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listZones({ search, page, page_size: PAGE_SIZE });
      setZones(res.data.items);
      setTotal(res.data.total);
    } catch { toast.error("Failed to load hosted zones"); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === zones.length) setSelected(new Set());
    else setSelected(new Set(zones.map(z => z.id)));
  };

  const selectedZones = zones.filter(z => selected.has(z.id));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="breadcrumb">Route 53</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 className="page-title">Hosted zones</h1>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create hosted zone
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ padding: "12px 24px", background: "#e6f2fa", borderBottom: "1px solid #c5dff0", fontSize: 12, color: "#0073bb", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        A hosted zone is a container for records, which defines how to route traffic for a domain.
      </div>

      {/* Main panel */}
      <div style={{ padding: "16px 24px" }}>
        <div className="aws-panel">
          {/* Toolbar */}
          <div className="toolbar">
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
              <div className="search-bar-wrapper">
                <Search size={14} />
                <input
                  className="search-input"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search by domain name"
                />
              </div>
              <button type="submit" className="btn-secondary">Search</button>
              {search && (
                <button type="button" className="btn-secondary" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
                  Clear
                </button>
              )}
            </form>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                className="btn-secondary"
                disabled={selected.size !== 1}
                onClick={() => { const z = selectedZones[0]; if (z) setEditZone(z); }}
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                className="btn-danger"
                disabled={selected.size === 0}
                onClick={() => setShowDelete(true)}
              >
                <Trash2 size={13} /> Delete
              </button>
              <button className="btn-secondary" onClick={fetchZones}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Count + pagination info */}
          <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--aws-border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#545B64" }}>
            <span>
              {selected.size > 0 ? <><strong>{selected.size}</strong> of </> : ""}
              <strong>{total}</strong> hosted zone{total !== 1 ? "s" : ""}
              {search && <span> matching "<strong>{search}</strong>"</span>}
            </span>
            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                <span style={{ padding: "4px 8px" }}>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto" }} />
              <p style={{ color: "#545B64", marginTop: 12, fontSize: 13 }}>Loading hosted zones…</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="empty-state">
              <Globe size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>{search ? "No zones match your search" : "No hosted zones"}</h3>
              <p>{search ? "Try a different search term." : "Create a hosted zone to start routing traffic for your domain."}</p>
              {!search && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Create hosted zone</button>}
            </div>
          ) : (
            <table className="aws-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" className="aws-checkbox" checked={selected.size === zones.length && zones.length > 0} onChange={toggleAll} />
                  </th>
                  <th>Domain name</th>
                  <th>Type</th>
                  <th>Records</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Hosted zone ID</th>
                </tr>
              </thead>
              <tbody>
                {zones.map(zone => (
                  <tr key={zone.id} className={selected.has(zone.id) ? "selected" : ""}>
                    <td><input type="checkbox" className="aws-checkbox" checked={selected.has(zone.id)} onChange={() => toggleSelect(zone.id)} /></td>
                    <td>
                      <span className="link" onClick={() => router.push(`/hosted-zones/${zone.id}`)}>
                        {zone.name}
                      </span>
                    </td>
                    <td><span className={`badge ${zone.type === "Public" ? "badge-green" : "badge-blue"}`}>{zone.type}</span></td>
                    <td>{zone.record_count}</td>
                    <td style={{ color: "#545B64" }}>{zone.comment || "—"}</td>
                    <td style={{ color: "#545B64", fontSize: 12 }}>{formatDate(zone.created_at)}</td>
                    <td style={{ color: "#545B64", fontSize: 12, fontFamily: "monospace" }}>{zone.id.substring(0, 14)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Bottom pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--aws-border)", display: "flex", justifyContent: "flex-end" }}>
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(1)}>«</button>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateZoneModal onClose={() => setShowCreate(false)} onCreated={() => { fetchZones(); setSelected(new Set()); }} />}
      {editZone && <EditZoneModal zone={editZone} onClose={() => setEditZone(null)} onUpdated={fetchZones} />}
      {showDelete && <DeleteModal zones={selectedZones} onClose={() => setShowDelete(false)} onDeleted={() => { fetchZones(); setSelected(new Set()); }} />}
    </div>
  );
}
