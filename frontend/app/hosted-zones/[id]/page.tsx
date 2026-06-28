"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getZone, listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import toast from "react-hot-toast";
import { Search, Plus, Trash2, Edit2, RefreshCw, ArrowLeft, ChevronDown, X, Info } from "lucide-react";

interface Zone { id: string; name: string; type: string; comment: string; record_count: number; }
interface DnsRecord { id: string; zone_id: string; name: string; type: string; ttl: number; value: string; routing_policy: string; created_at: string; updated_at: string; }

const RECORD_TYPES = ["A","AAAA","CNAME","TXT","MX","NS","PTR","SRV","CAA","SOA"];
const ROUTING_POLICIES = ["Simple","Weighted","Latency","Failover","Geolocation","Multivalue"];

const TYPE_HINTS: { [k: string]: string } = {
  A: "IPv4 address (e.g., 192.0.2.1)",
  AAAA: "IPv6 address (e.g., 2001:0db8::1)",
  CNAME: "Canonical name (e.g., example.com.)",
  TXT: "Text value in quotes (e.g., \"v=spf1 include:example.com ~all\")",
  MX: "Priority and mail server (e.g., 10 mail.example.com.)",
  NS: "Name server hostname (e.g., ns1.example.com.)",
  PTR: "Pointer record for reverse DNS",
  SRV: "Service record (priority weight port target)",
  CAA: "Certificate authority authorization",
  SOA: "Start of authority record",
};

function RecordModal({
  zone, record, onClose, onSaved
}: {
  zone: Zone; record?: DnsRecord | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!record;
  const [name, setName] = useState(record?.name || zone.name);
  const [type, setType] = useState(record?.type || "A");
  const [ttl, setTtl] = useState(String(record?.ttl ?? 300));
  const [value, setValue] = useState(record?.value || "");
  const [routing, setRouting] = useState(record?.routing_policy || "Simple");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit && record) {
        await updateRecord(zone.id, record.id, { name, ttl: parseInt(ttl), value, routing_policy: routing });
        toast.success("Record updated");
      } else {
        await createRecord(zone.id, { name, type, ttl: parseInt(ttl), value, routing_policy: routing });
        toast.success("Record created");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save record");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? "Edit record" : "Create record"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#545B64" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="aws-label">Record name <span style={{ color: "#D13212" }}>*</span></label>
                <input className="aws-input" value={name} onChange={e => setName(e.target.value)} required />
                <p className="aws-label-hint">Subdomain or zone apex (e.g., www or {zone.name})</p>
              </div>
              <div className="form-group">
                <label className="aws-label">Record type <span style={{ color: "#D13212" }}>*</span></label>
                <select className="aws-select" style={{ width: "100%" }} value={type} onChange={e => setType(e.target.value)} disabled={isEdit}>
                  {RECORD_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="aws-label">TTL (seconds)</label>
                <input className="aws-input" type="number" value={ttl} onChange={e => setTtl(e.target.value)} min={0} max={2147483647} />
                <p className="aws-label-hint">How long resolvers cache this record</p>
              </div>
              <div className="form-group">
                <label className="aws-label">Routing policy</label>
                <select className="aws-select" style={{ width: "100%" }} value={routing} onChange={e => setRouting(e.target.value)}>
                  {ROUTING_POLICIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="aws-label">Value <span style={{ color: "#D13212" }}>*</span></label>
              <textarea
                className="aws-input"
                style={{ minHeight: 90, resize: "vertical", fontFamily: "monospace" }}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={TYPE_HINTS[type] || "Enter value"}
                required
              />
              <p className="aws-label-hint">{TYPE_HINTS[type]}</p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save changes" : "Create records"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteRecordsModal({ records, zoneId, onClose, onDeleted }: { records: DnsRecord[]; zoneId: string; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState("");

  const handleDelete = async () => {
    if (confirm !== "delete") return;
    setLoading(true);
    try {
      await Promise.all(records.map(r => deleteRecord(zoneId, r.id)));
      toast.success(`${records.length} record${records.length > 1 ? "s" : ""} deleted`);
      onDeleted();
      onClose();
    } catch { toast.error("Failed to delete record(s)"); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: "#D13212" }}>Delete record{records.length > 1 ? "s" : ""}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="flash flash-error">
            <Info size={16} style={{ flexShrink: 0 }} />
            <span>You are about to delete <strong>{records.length}</strong> record{records.length > 1 ? "s" : ""}. This cannot be undone.</span>
          </div>
          <ul style={{ margin: "12px 0", paddingLeft: 20, fontSize: 13 }}>
            {records.map(r => <li key={r.id}><strong>{r.name}</strong> ({r.type})</li>)}
          </ul>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="aws-label">Type <strong>delete</strong> to confirm</label>
            <input className="aws-input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="delete" autoFocus />
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

export default function ZoneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [zone, setZone] = useState<Zone | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<DnsRecord | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const PAGE_SIZE = 20;

  const fetchZone = async () => {
    try { const r = await getZone(id); setZone(r.data); } catch { toast.error("Zone not found"); router.push("/hosted-zones"); }
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listRecords(id, { search, type_filter: typeFilter || undefined, page, page_size: PAGE_SIZE });
      setRecords(res.data.items);
      setTotal(res.data.total);
    } catch { toast.error("Failed to load records"); }
    finally { setLoading(false); }
  }, [id, search, typeFilter, page]);

  useEffect(() => { fetchZone(); }, [id]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const toggleSelect = (rid: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(rid) ? n.delete(rid) : n.add(rid); return n; });
  };
  const toggleAll = () => {
    if (selected.size === records.length) setSelected(new Set());
    else setSelected(new Set(records.map(r => r.id)));
  };

  const selectedRecords = records.filter(r => selected.has(r.id));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  const typeColor: { [k: string]: string } = {
    A: "badge-green", AAAA: "badge-blue", CNAME: "badge-orange",
    TXT: "badge-gray", MX: "badge-blue", NS: "badge-gray",
    SOA: "badge-gray", PTR: "badge-orange", SRV: "badge-blue", CAA: "badge-gray",
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="breadcrumb">
          <a onClick={() => router.push("/hosted-zones")} style={{ cursor: "pointer" }}>Route 53</a>
          {" › "}
          <a onClick={() => router.push("/hosted-zones")} style={{ cursor: "pointer" }}>Hosted zones</a>
          {" › "}
          {zone?.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">{zone?.name || "Loading…"}</h1>
            <div style={{ fontSize: 12, color: "#545B64", marginTop: 2 }}>
              {zone && <>
                <span className={`badge ${zone.type === "Public" ? "badge-green" : "badge-blue"}`} style={{ marginRight: 8 }}>{zone.type}</span>
                Zone ID: <code style={{ fontSize: 11 }}>{zone.id}</code>
              </>}
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create record
          </button>
        </div>
      </div>

      {/* Records panel */}
      <div style={{ padding: "16px 24px" }}>
        <div className="aws-panel">
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--aws-border)", display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ fontSize: 14 }}>Records</strong>
            <span style={{ fontSize: 12, color: "#545B64", marginLeft: 4 }}>({total})</span>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
              <div className="search-bar-wrapper">
                <Search size={14} />
                <input className="search-input" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search by name" />
              </div>
              <select className="aws-select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
                <option value="">All types</option>
                {RECORD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <button type="submit" className="btn-secondary">Search</button>
              {(search || typeFilter) && (
                <button type="button" className="btn-secondary" onClick={() => { setSearch(""); setSearchInput(""); setTypeFilter(""); setPage(1); }}>
                  Clear
                </button>
              )}
            </form>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button className="btn-secondary" disabled={selected.size !== 1} onClick={() => { const r = selectedRecords[0]; if (r) setEditRecord(r); }}>
                <Edit2 size={13} /> Edit
              </button>
              <button className="btn-danger" disabled={selected.size === 0} onClick={() => setShowDelete(true)}>
                <Trash2 size={13} /> Delete
              </button>
              <button className="btn-secondary" onClick={fetchRecords}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Count row */}
          <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--aws-border)", fontSize: 12, color: "#545B64", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              {selected.size > 0 && <><strong>{selected.size}</strong> of </>}
              <strong>{total}</strong> record{total !== 1 ? "s" : ""}
            </span>
            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                <span style={{ padding: "4px 8px" }}>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: "center" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <h3>{search || typeFilter ? "No records match" : "No records"}</h3>
              <p>{search || typeFilter ? "Try different filters." : "Create your first DNS record."}</p>
              {!search && !typeFilter && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Create record</button>}
            </div>
          ) : (
            <table className="aws-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" className="aws-checkbox" checked={selected.size === records.length && records.length > 0} onChange={toggleAll} />
                  </th>
                  <th>Record name</th>
                  <th>Type</th>
                  <th>Routing policy</th>
                  <th>TTL (s)</th>
                  <th>Value/Route traffic to</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id} className={selected.has(rec.id) ? "selected" : ""}>
                    <td><input type="checkbox" className="aws-checkbox" checked={selected.has(rec.id)} onChange={() => toggleSelect(rec.id)} /></td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{rec.name}</td>
                    <td><span className={`badge ${typeColor[rec.type] || "badge-gray"}`}>{rec.type}</span></td>
                    <td style={{ color: "#545B64" }}>{rec.routing_policy}</td>
                    <td style={{ color: "#545B64" }}>{rec.ttl}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "pre" }}>
                      {rec.value.length > 80 ? rec.value.substring(0, 80) + "…" : rec.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && zone && <RecordModal zone={zone} onClose={() => setShowCreate(false)} onSaved={fetchRecords} />}
      {editRecord && zone && <RecordModal zone={zone} record={editRecord} onClose={() => setEditRecord(null)} onSaved={fetchRecords} />}
      {showDelete && zone && <DeleteRecordsModal records={selectedRecords} zoneId={zone.id} onClose={() => setShowDelete(false)} onDeleted={() => { fetchRecords(); setSelected(new Set()); }} />}
    </div>
  );
}
