"use client";

import React, { useState, useEffect } from "react";
import { API_BASE } from "../../../lib/config";
import { getToken } from "../../../lib/auth";
import { fetchWithAuth } from "../../../lib/fetchWithAuth";

type Prescription = {
  prescription_id: number;
  patient_id: number;
  visit_id: number;
  first_name: string;
  last_name: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration_days: number;
};

type Patient = {
  patient_id: number;
  first_name: string;
  last_name: string;
};

type Visit = {
  visit_id: number;
  patient_id: number;
  visit_date: string;
  reason: string;
};

type PrescriptionForm = {
  patient_id: string;
  visit_id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration_days: string;
};

const emptyForm: PrescriptionForm = {
  patient_id: "",
  visit_id: "",
  medication: "",
  dosage: "",
  frequency: "",
  duration_days: "",
};

const inputClass = (disabled: boolean) =>
  `w-full border rounded-lg px-3 py-2 text-sm outline-none transition ${
    disabled
      ? "bg-gray-50 text-gray-500"
      : "bg-white text-gray-900 focus:border-blue-500"
  }`;

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [form, setForm] = useState<PrescriptionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<Prescription | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
    fetchVisits();
  }, []);

  useEffect(() => {
    if (form.patient_id) {
      setFilteredVisits(visits.filter((v) => v.patient_id === Number(form.patient_id)));
    } else {
      setFilteredVisits([]);
    }
  }, [form.patient_id, visits]);

  const fetchPrescriptions = async () => {
    try {
      const token = getToken();
      const res = await fetchWithAuth(`${API_BASE}/prescriptions`);
      const result = await res.json();
      setPrescriptions(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error("Failed to fetch prescriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const token = getToken();
      const res = await fetchWithAuth(`${API_BASE}/patients`);
      const result = await res.json();
      setPatients(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    }
  };

  const fetchVisits = async () => {
    try {
      const token = getToken();
      const res = await fetchWithAuth(`${API_BASE}/visits`);
      const result = await res.json();
      const data = result?.data || result?.visits || result?.result || result;
      setVisits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch visits:", err);
    }
  };

  const handleOpenAdd = () => {
    setMode("add");
    setSelected(null);
    setModalError("");
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenModal = (record: Prescription, m: "view" | "edit") => {
    setMode(m);
    setSelected(record);
    setModalError("");
    setForm({
      patient_id: record.patient_id.toString(),
      visit_id: record.visit_id.toString(),
      medication: record.medication || "",
      dosage: record.dosage || "",
      frequency: record.frequency || "",
      duration_days: record.duration_days?.toString() || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.patient_id) { setModalError("Please select a patient."); return; }
    if (!form.visit_id) { setModalError("Please select a visit."); return; }
    if (!form.medication.trim()) { setModalError("Please enter a medication."); return; }

    setSaving(true);
    setModalError("");
    try {
      const token = getToken();
      const fields = {
        medication: form.medication,
        dosage: form.dosage,
        frequency: form.frequency,
        duration_days: form.duration_days ? Number(form.duration_days) : null,
      };

      if (mode === "add") {
        const res = await fetchWithAuth(`${API_BASE}/prescriptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patient_id: Number(form.patient_id), visit_id: Number(form.visit_id), ...fields }),
        });
        const data = await res.json();
        if (!res.ok) { setModalError(data.message || "Failed to create prescription."); return; }
      } else if (mode === "edit" && selected) {
        const res = await fetchWithAuth(`${API_BASE}/prescriptions/${selected.prescription_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        const data = await res.json();
        if (!res.ok) { setModalError(data.message || "Failed to update prescription."); return; }
      }

      await fetchPrescriptions();
      setShowModal(false);
    } catch {
      setModalError("Connection error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    setDeleting(true);
    try {
      const token = getToken();
      const res = await fetchWithAuth(`${API_BASE}/prescriptions/${deletingRecord.prescription_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchPrescriptions();
        setShowDeleteConfirm(false);
        setDeletingRecord(null);
      } else {
        console.error("Failed to delete prescription: server returned", res.status);
      }
    } catch (err) {
      console.error("Failed to delete prescription:", err);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = prescriptions.filter((p) => {
    const q = search.toLowerCase();
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return (
      fullName.includes(q) ||
      p.medication?.toLowerCase().includes(q) ||
      p.dosage?.toLowerCase().includes(q) ||
      p.frequency?.toLowerCase().includes(q) ||
      p.patient_id.toString().includes(q) ||
      p.visit_id.toString().includes(q)
    );
  });

  const initials = (first: string, last: string) =>
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

  const getColor = (name: string) =>
    ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"][
      (name?.charCodeAt(0) ?? 0) % 6
    ];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-screen" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Topbar */}
      <div className="bg-white px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "0.5px solid #E5E7EB" }}>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Prescriptions</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage patient medications and treatments</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
          style={{ background: "#3B82F6" }}
          onClick={handleOpenAdd}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Prescription
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 px-6 py-5 flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          <div className="bg-white rounded-xl px-4 py-3 relative overflow-hidden" style={{ border: "0.5px solid #E5E7EB" }}>
            <div className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl" style={{ background: "#8B5CF6" }} />
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Total Prescriptions</p>
            <p className="text-2xl font-semibold text-gray-900">{prescriptions.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg px-4 py-2.5 flex items-center gap-3 flex-shrink-0" style={{ border: "0.5px solid #E5E7EB" }}>
          <svg width="14" height="14" fill="none" stroke="#C4C9D4" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="22" y2="22" />
          </svg>
          <input
            type="text"
            placeholder="Search by patient, medication, dosage, frequency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-300"
          />
        </div>

        <div className="bg-white rounded-xl flex flex-col min-h-0 flex-1" style={{ border: "0.5px solid #E5E7EB" }}>
          <div
            className="grid px-5 py-2.5 bg-gray-50 rounded-t-xl flex-shrink-0"
            style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1fr .8fr", borderBottom: "0.5px solid #E5E7EB" }}
          >
            {["Patient", "Medication", "Dosage", "Frequency", "Duration", "Actions"].map((h) => (
              <div key={h} className="text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</div>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading prescriptions...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <svg width="40" height="40" fill="none" stroke="#D1D5DB" strokeWidth="1.2" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <line x1="9" y1="12" x2="15" y2="12" />
                  <line x1="9" y1="16" x2="13" y2="16" />
                </svg>
                <p className="text-sm text-gray-400">
                  {search ? "No prescriptions match your search." : "No prescriptions yet. Add one to get started."}
                </p>
              </div>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.prescription_id}
                  className="grid px-5 py-3 items-center hover:bg-gray-50 transition-colors"
                  style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1fr .8fr", borderBottom: "0.5px solid #F3F4F6" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ background: getColor(p.first_name) }}
                    >
                      {initials(p.first_name, p.last_name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-gray-300">#{p.patient_id}</p>
                    </div>
                  </div>
                  <div>
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium truncate max-w-[160px]" style={{ background: "#EDE9FE", color: "#6D28D9" }} title={p.medication}>
                      {p.medication || "—"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{p.dosage || "—"}</p>
                  <p className="text-sm text-gray-400">{p.frequency || "—"}</p>
                  <p className="text-sm text-gray-400">{p.duration_days ? `${p.duration_days} days` : "—"}</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleOpenModal(p, "view")} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all" style={{ border: "0.5px solid #E5E7EB" }} title="View">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M2 12C4.5 6 8.5 3 12 3s7.5 3 10 9c-2.5 6-6.5 9-10 9s-7.5-3-10-9z" /></svg>
                    </button>
                    <button onClick={() => handleOpenModal(p, "edit")} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all" style={{ border: "0.5px solid #E5E7EB" }} title="Edit">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => { setDeletingRecord(p); setShowDeleteConfirm(true); }} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" style={{ border: "0.5px solid #E5E7EB" }} title="Delete">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Record Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg flex flex-col shadow-xl overflow-hidden" style={{ border: "0.5px solid #E5E7EB" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "0.5px solid #E5E7EB" }}>
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === "view" ? "Prescription Details" : mode === "edit" ? "Edit Prescription" : "Add Prescription"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4 max-h-[75vh]">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Prescription Details</p>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Patient <span className = "required text-red-500">*</span></label>
                {mode === "view" || mode === "edit" ? (
                  <input required disabled value={selected ? `${selected.first_name} ${selected.last_name} (#${selected.patient_id})` : ""} className={inputClass(true)} style={{ border: "0.5px solid #E5E7EB" }} />
                ) : (
                  <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value, visit_id: "" })} className={inputClass(false)} style={{ border: "0.5px solid #E5E7EB" }}>
                    <option value="">Select Patient</option>
                    {patients.map((pt) => (
                      <option key={pt.patient_id} value={pt.patient_id}>
                        {pt.first_name} {pt.last_name} (#{pt.patient_id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Visit <span className = "required text-red-500">*</span></label>
                {mode === "view" || mode === "edit" ? (
                  <input required disabled value={selected ? `Visit #${selected.visit_id}` : ""} className={inputClass(true)} style={{ border: "0.5px solid #E5E7EB" }} />
                ) : (
                  <select value={form.visit_id} onChange={(e) => setForm({ ...form, visit_id: e.target.value })} disabled={!form.patient_id} className={inputClass(!form.patient_id)} style={{ border: "0.5px solid #E5E7EB" }}>
                    <option value="">{form.patient_id ? "Select Visit" : "Select a patient first"}</option>
                    {filteredVisits.map((v) => (
                      <option key={v.visit_id} value={v.visit_id}>
                        Visit #{v.visit_id} — {formatDate(v.visit_date)}{v.reason ? ` (${v.reason})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Medication <span className = "required text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Amoxicillin" disabled={mode === "view"} value={form.medication} onChange={(e) => setForm({ ...form, medication: e.target.value })} className={inputClass(mode === "view")} style={{ border: "0.5px solid #E5E7EB" }} />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Dosage <span className = "required text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. 500mg" disabled={mode === "view"} value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} className={inputClass(mode === "view")} style={{ border: "0.5px solid #E5E7EB" }} />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Frequency <span className = "required text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Twice a day" disabled={mode === "view"} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={inputClass(mode === "view")} style={{ border: "0.5px solid #E5E7EB" }} />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Duration (days) <span className = "required text-red-500">*</span></label>
                <input required type="number" placeholder="e.g. 7" min={1} disabled={mode === "view"} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} className={inputClass(mode === "view")} style={{ border: "0.5px solid #E5E7EB" }} />
              </div>

              {modalError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{modalError}</p>
              )}
            </div>

            <div className="px-6 py-4 flex justify-end gap-2" style={{ borderTop: "0.5px solid #E5E7EB", background: "#F9FAFB" }}>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                {mode === "view" ? "Close" : "Cancel"}
              </button>
              {mode === "view" && (
                <button onClick={() => setMode("edit")} className="px-6 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#3B82F6" }}>Edit</button>
              )}
              {mode !== "view" && (
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-70" style={{ background: "#3B82F6" }}>
                  {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Prescription"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && deletingRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6 flex flex-col gap-4" style={{ border: "0.5px solid #E5E7EB" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Delete Prescription</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Are you sure you want to delete the prescription for{" "}
                  <span className="font-medium text-gray-700">{deletingRecord.first_name} {deletingRecord.last_name}</span>? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setDeletingRecord(null); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-70" style={{ background: "#EF4444" }}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}