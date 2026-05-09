"use client";

import React, { useState, useEffect } from "react";
import { API_BASE } from "../../../lib/config";
import { getToken } from "../../../lib/auth";
import { fetchWithAuth } from "../../../lib/fetchWithAuth";

type Visit = {
  visit_id: number;
  patient_id: number;
  first_name: string;
  last_name: string;
  visit_date: string;
  reason: string;
  diagnosis: string;
  blood_pressure: string;
  temperature: number;
  weight_kg: number;
  height_cm: number;
  attended_by: string;
};

type Patient = {
  patient_id: number;
  first_name: string;
  last_name: string;
};

type VisitForm = {
  patient_id: string;
  visit_date: string;
  reason: string;
  diagnosis: string;
  blood_pressure: string;
  temperature: string;
  weight_kg: string;
  height_cm: string;
  attended_by: string;
};

const emptyForm: VisitForm = {
  patient_id: "",
  visit_date: "",
  reason: "",
  diagnosis: "",
  blood_pressure: "",
  temperature: "",
  weight_kg: "",
  height_cm: "",
  attended_by: "",
};

const Badge = ({ value }: { value: string }) => {
  if (!value) return <span className="text-sm text-gray-300">—</span>;
  return (
    <span
      className="inline-block text-xs px-2 py-0.5 rounded-full font-medium truncate max-w-[140px]"
      style={{ background: "#F3F4F6", color: "#374151" }}
      title={value}
    >
      {value}
    </span>
  );
};

const inputClass = (disabled: boolean) =>
  `w-full border rounded-lg px-3 py-2 text-sm outline-none transition ${
    disabled
      ? "bg-gray-50 text-gray-500"
      : "bg-white text-gray-900 focus:border-blue-500"
  }`;

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [selected, setSelected] = useState<Visit | null>(null);
  const [form, setForm] = useState<VisitForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingVisit, setDeletingVisit] = useState<Visit | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchVisits();
    fetchPatients();
  }, []);

  const fetchVisits = async () => {
    try {
      const token = getToken();
      const res = await fetchWithAuth(`${API_BASE}/visits`);
      const result = await res.json();
      const data = result?.data || result?.visits || result?.result || result;
      setVisits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch visits:", err);
      setVisits([]);
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

  const handleOpenAdd = () => {
    setMode("add");
    setSelected(null);
    setModalError("");
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenModal = (visit: Visit, m: "view" | "edit") => {
    setMode(m);
    setSelected(visit);
    setModalError("");
    setForm({
      patient_id: visit.patient_id.toString(),
      visit_date: visit.visit_date ? visit.visit_date.split("T")[0] : "",
      reason: visit.reason || "",
      diagnosis: visit.diagnosis || "",
      blood_pressure: visit.blood_pressure || "",
      temperature: visit.temperature?.toString() || "",
      weight_kg: visit.weight_kg?.toString() || "",
      height_cm: visit.height_cm?.toString() || "",
      attended_by: visit.attended_by || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.patient_id) {
      setModalError("Please select a patient.");
      return;
    }
    if (!form.visit_date) {
      setModalError("Please enter a visit date.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      const body = {
        patient_id: Number(form.patient_id),
        visit_date: form.visit_date,
        reason: form.reason,
        diagnosis: form.diagnosis,
        blood_pressure: form.blood_pressure,
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        attended_by: form.attended_by,
      };

      if (mode === "add") {
        const res = await fetchWithAuth(`${API_BASE}/visits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setModalError(data.message || "Failed to create visit.");
          return;
        }
      } else if (mode === "edit" && selected) {
        const res = await fetchWithAuth(`${API_BASE}/visits/${selected.visit_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setModalError(data.message || "Failed to update visit.");
          return;
        }
      }

      await fetchVisits();
      setShowModal(false);
    } catch {
      setModalError("Connection error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingVisit) return;
    setDeleting(true);
    try {
      const token = getToken();
      const res = await fetchWithAuth(`${API_BASE}/visits/${deletingVisit.visit_id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchVisits();
        setShowDeleteConfirm(false);
        setDeletingVisit(null);
      }
    } catch (err) {
      console.error("Failed to delete visit:", err);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = visits.filter((v) => {
    const q = search.toLowerCase();
    const fullName = `${v.first_name} ${v.last_name}`.toLowerCase();
    return (
      fullName.includes(q) ||
      v.reason?.toLowerCase().includes(q) ||
      v.diagnosis?.toLowerCase().includes(q) ||
      v.attended_by?.toLowerCase().includes(q) ||
      v.patient_id.toString().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const initials = (first: string, last: string) =>
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

  const getColor = (name: string) =>
    ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"][
      (name?.charCodeAt(0) ?? 0) % 6
    ];

  const f = (val: string | number | null | undefined, suffix = "") =>
    val !== null && val !== undefined && val !== "" ? `${val}${suffix}` : "—";

  return (
    <div
      className="flex flex-col h-screen"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* Topbar */}
      <div
        className="bg-white px-6 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "0.5px solid #E5E7EB" }}
      >
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Visits</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Track patient consultations and check-ups
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
          style={{ background: "#3B82F6" }}
          onClick={handleOpenAdd}
        >
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Visit
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 px-6 py-5 flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          <div
            className="bg-white rounded-xl px-4 py-3 relative overflow-hidden"
            style={{ border: "0.5px solid #E5E7EB" }}
          >
            <div
              className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl"
              style={{ background: "#10B981" }}
            />
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
              Total Visits
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {visits.length}
            </p>
          </div>
        </div>

        <div
          className="bg-white rounded-lg px-4 py-2.5 flex items-center gap-3 flex-shrink-0"
          style={{ border: "0.5px solid #E5E7EB" }}
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke="#C4C9D4"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="22" y2="22" />
          </svg>
          <input
            type="text"
            placeholder="Search by patient, reason, diagnosis, doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-300"
          />
        </div>

        <div
          className="bg-white rounded-xl flex flex-col min-h-0 flex-1"
          style={{ border: "0.5px solid #E5E7EB" }}
        >
          <div
            className="grid px-5 py-2.5 bg-gray-50 rounded-t-xl flex-shrink-0"
            style={{
              gridTemplateColumns: "2fr 1fr 1.2fr 1.2fr 1.1fr 1.1fr .8fr",
              borderBottom: "0.5px solid #E5E7EB",
            }}
          >
            {[
              "Patient",
              "Visit Date",
              "Reason",
              "Diagnosis",
              "Vitals",
              "Doctor",
              "Actions",
            ].map((h) => (
              <div
                key={h}
                className="text-xs font-semibold uppercase tracking-wide text-gray-400"
              >
                {h}
              </div>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                Loading visits...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <svg
                  width="40"
                  height="40"
                  fill="none"
                  stroke="#D1D5DB"
                  strokeWidth="1.2"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p className="text-sm text-gray-400">
                  {search
                    ? "No visits match your search."
                    : "No visits yet. Add one to get started."}
                </p>
              </div>
            ) : (
              filtered.map((v) => (
                <div
                  key={v.visit_id}
                  className="grid px-5 py-3 items-center hover:bg-gray-50 transition-colors"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1.2fr 1.2fr 1.1fr 1.1fr .8fr",
                    borderBottom: "0.5px solid #F3F4F6",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ background: getColor(v.first_name) }}
                    >
                      {initials(v.first_name, v.last_name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {v.first_name} {v.last_name}
                      </p>
                      <p className="text-xs text-gray-300">#{v.patient_id}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700">
                    {formatDate(v.visit_date)}
                  </p>

                  <div className="flex">
                    <Badge value={v.reason} />
                  </div>

                  <div className="flex">
                    <Badge value={v.diagnosis} />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-gray-500">
                      BP: {f(v.blood_pressure)}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Temp: {f(v.temperature, "°C")}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Wt: {f(v.weight_kg, " kg")}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Ht: {f(v.height_cm, " cm")}
                    </span>
                  </div>

                  <div className="flex">
                    <Badge value={v.attended_by} />
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenModal(v, "view")}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                      style={{ border: "0.5px solid #E5E7EB" }}
                      title="View"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M2 12C4.5 6 8.5 3 12 3s7.5 3 10 9c-2.5 6-6.5 9-10 9s-7.5-3-10-9z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleOpenModal(v, "edit")}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                      style={{ border: "0.5px solid #E5E7EB" }}
                      title="Edit"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setDeletingVisit(v);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      style={{ border: "0.5px solid #E5E7EB" }}
                      title="Delete"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Visit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl w-full max-w-lg flex flex-col shadow-xl overflow-hidden"
            style={{ border: "0.5px solid #E5E7EB" }}
          >
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: "0.5px solid #E5E7EB" }}
            >
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === "view" ? "Visit Details" : mode === "edit" ? "Edit Visit" : "Add Visit"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-5 max-h-[75vh]">
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                  Visit Info
                </p>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Patient <span className = "required text-red-500">*</span></label>
                  {mode === "view" ? (
                    <input
                      disabled
                      required
                      value={selected ? `${selected.first_name} ${selected.last_name}` : ""}
                      className={inputClass(true)}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  ) : (
                    <select
                      value={form.patient_id}
                      onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                      className={inputClass(false)}
                      style={{ border: "0.5px solid #E5E7EB" }}
                      disabled={mode === "edit"}
                    >
                      <option value="">Select Patient</option>
                      {patients.map((p) => (
                        <option key={p.patient_id} value={p.patient_id}>
                          {p.first_name} {p.last_name} (#{p.patient_id})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Visit Date <span className = "required text-red-500">*</span></label>
                    <input
                      type={mode === "view" ? "text" : "date"}
                      disabled={mode === "view"}
                      required
                      value={mode === "view" ? formatDate(selected?.visit_date ?? "") : form.visit_date}
                      onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Attended By <span className = "required text-red-500">*</span></label>
                    <input
                      placeholder="Doctor / Nurse"
                      disabled={mode === "view"}
                      required
                      value={form.attended_by}
                      onChange={(e) => setForm({ ...form, attended_by: e.target.value })}
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Reason for Visit <span className = "required text-red-500">*</span></label>
                  <textarea
                    placeholder="Chief complaint or reason..."
                    disabled={mode === "view"}
                    required
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    rows={2}
                    className={inputClass(mode === "view") + " resize-none"}
                    style={{ border: "0.5px solid #E5E7EB" }}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Diagnosis <span className = "required text-red-500">*</span></label>
                  <textarea
                    placeholder="Clinical diagnosis..."
                    disabled={mode === "view"}
                    required
                    value={form.diagnosis}
                    onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                    rows={2}
                    className={inputClass(mode === "view") + " resize-none"}
                    style={{ border: "0.5px solid #E5E7EB" }}
                  />
                </div>
              </div>

              <div
                className="flex flex-col gap-3 pt-4"
                style={{ borderTop: "0.5px dashed #E5E7EB" }}
              >
                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">
                  Vitals
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Blood Pressure <span className = "required text-red-500">*</span></label>
                    <input
                      placeholder="e.g. 120/80"
                      disabled={mode === "view"}
                      required
                      value={form.blood_pressure}
                      onChange={(e) => setForm({ ...form, blood_pressure: e.target.value })}
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Temperature (°C) <span className = "required text-red-500">*</span></label>
                    <input
                      type={mode === "view" ? "text" : "number"}
                      placeholder="e.g. 36.5"
                      disabled={mode === "view"}
                      required
                      value={form.temperature}
                      onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Weight (kg) <span className = "required text-red-500">*</span></label>
                    <input
                      type={mode === "view" ? "text" : "number"}
                      placeholder="e.g. 65"
                      disabled={mode === "view"}
                      required
                      value={form.weight_kg}
                      onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Height (cm) <span className = "required text-red-500">*</span></label>
                    <input
                      type={mode === "view" ? "text" : "number"}
                      placeholder="e.g. 170"
                      disabled={mode === "view"}
                      required
                      value={form.height_cm}
                      onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                </div>
              </div>

              {modalError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  {modalError}
                </p>
              )}
            </div>

            <div
              className="px-6 py-4 flex justify-end gap-2"
              style={{ borderTop: "0.5px solid #E5E7EB", background: "#F9FAFB" }}
            >
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                {mode === "view" ? "Close" : "Cancel"}
              </button>
              {mode === "view" && (
                <button
                  onClick={() => setMode("edit")}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: "#3B82F6" }}
                >
                  Edit
                </button>
              )}
              {mode !== "view" && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-70"
                  style={{ background: "#3B82F6" }}
                >
                  {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Visit"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && deletingVisit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6 flex flex-col gap-4"
            style={{ border: "0.5px solid #E5E7EB" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Delete Visit</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Are you sure you want to delete the visit for{" "}
                  <span className="font-medium text-gray-700">
                    {deletingVisit.first_name} {deletingVisit.last_name}
                  </span>{" "}
                  on{" "}
                  <span className="font-medium text-gray-700">
                    {formatDate(deletingVisit.visit_date)}
                  </span>
                  ? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingVisit(null);
                }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-70"
                style={{ background: "#EF4444" }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}