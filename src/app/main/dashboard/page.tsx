"use client";

import React, { useState, useEffect } from "react";
import { API_BASE } from "../../../lib/config";
import { getToken } from "../../../lib/auth";
import { fetchWithAuth } from "../../../lib/fetchWithAuth";

type Patient = {
  patient_id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  birthdate: string;
  sex: string;
  address: string;
  phone_no: string;
  email: string;
  calculated_age: number;
};

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

type EmergencyContact = {
  contact_id?: number;
  person_name: string;
  relationship: string;
  phone_no: string;
};

type PatientForm = {
  first_name: string;
  middle_name: string;
  last_name: string;
  birthdate: string;
  sex: string;
  address: string;
  phone_no: string;
  email: string;
};

const emptyForm: PatientForm = {
  first_name: "",
  middle_name: "",
  last_name: "",
  birthdate: "",
  sex: "",
  address: "",
  phone_no: "",
  email: "",
};

const emptyContact: EmergencyContact = {
  person_name: "",
  relationship: "",
  phone_no: "",
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>(emptyContact);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await fetchPatients();
      await fetchVisits();
      await fetchPrescriptions();
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const urls = [
        `${API_BASE}/patients?limit=1000`,
        `${API_BASE}/patients?per_page=1000`,
        `${API_BASE}/patients?page=1&limit=1000`,
        `${API_BASE}/patients?_limit=1000`,
        `${API_BASE}/patients?all=true`,
        `${API_BASE}/patients`,
      ];

      let allPatients: Patient[] = [];

      for (const url of urls) {
        try {
          console.log(`🔍 Dashboard: Trying patients URL: ${url}`);
          const res = await fetchWithAuth(url);

          if (!res.ok) continue;

          const result = await res.json();
          console.log(` Patients response:`, {
            url,
            dataLength: Array.isArray(result.data) ? result.data.length : result.length || 0,
            total: result.total || result.count || "unknown",
            keys: Object.keys(result),
          });

          if (Array.isArray(result.data)) {
            allPatients = result.data;
          } else if (Array.isArray(result)) {
            allPatients = result;
          } else if (result.patients && Array.isArray(result.patients)) {
            allPatients = result.patients;
          }

          if (allPatients.length > 0) {
            console.log(` Dashboard: Found ${allPatients.length} patients!`);
            setPatients(allPatients);
            break;
          }
        } catch (urlErr) {
          console.log(` URL failed: ${url}`);
          continue;
        }
      }

      if (allPatients.length === 0) {
        console.warn(" No patients found from any URL");
        setPatients([]);
      }
    } catch (err) {
      console.error(" Failed to fetch patients:", err);
      setPatients([]);
    }
  };

  const fetchVisits = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/visits?limit=1000`);
      const result = await res.json();
      const data = result?.data || result?.visits || result?.result || result;
      setVisits(Array.isArray(data) ? data : []);
      console.log(` Dashboard visits: ${Array.isArray(data) ? data.length : 0}`);
    } catch (err) {
      console.error("Failed to fetch visits:", err);
      setVisits([]);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/prescriptions?limit=1000`);
      const result = await res.json();
      const data = result?.data || result?.prescriptions || result?.result || result;
      setPrescriptions(Array.isArray(data) ? data : []);
      console.log(` Dashboard prescriptions: ${Array.isArray(data) ? data.length : 0}`);
    } catch (err) {
      console.error("Failed to fetch prescriptions:", err);
      setPrescriptions([]);
    }
  };

  const fetchEmergencyContact = async (patientId: number) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/patients/${patientId}/emergency-contact`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setEmergencyContact({
          contact_id: data[0].contact_id,
          person_name: data[0].person_name || "",
          relationship: data[0].relationship || "",
          phone_no: data[0].phone_no || "",
        });
      } else {
        setEmergencyContact(emptyContact);
      }
    } catch {
      setEmergencyContact(emptyContact);
    }
  };

  const handleOpenModal = async (patient: Patient, m: "view" | "edit") => {
    setMode(m);
    setSelectedPatient(patient);
    setModalError("");
    setForm({
      first_name: patient.first_name || "",
      middle_name: patient.middle_name || "",
      last_name: patient.last_name || "",
      birthdate: patient.birthdate ? patient.birthdate.split("T")[0] : "",
      sex: patient.sex || "",
      address: patient.address || "",
      phone_no: patient.phone_no || "",
      email: patient.email || "",
    });
    await fetchEmergencyContact(patient.patient_id);
    setShowModal(true);
  };

  const handleOpenAdd = () => {
    setMode("add");
    setSelectedPatient(null);
    setModalError("");
    setForm(emptyForm);
    setEmergencyContact(emptyContact);
    setShowModal(true);
  };

  // Helper: build full display name, skipping empty middle name
  const fullName = (p: Patient) =>
    [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ");

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      fullName(p).toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone_no?.includes(search) ||
      p.address?.toLowerCase().includes(q) ||
      p.patient_id.toString().includes(search)
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
    const date = new Date(dateStr.split("T")[0]);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const inputClass = (disabled: boolean) =>
    `w-full border rounded-lg px-3 py-2 text-sm outline-none transition ${
      disabled
        ? "bg-gray-50 text-gray-500"
        : "bg-white text-gray-900 focus:border-blue-500"
    }`;

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* Topbar */}
      <div
        className="bg-white px-6 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "0.5px solid #E5E7EB" }}
      >
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">View and manage the system</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Patients", val: patients.length, color: "#3B82F6" },
            { label: "Total Visits", val: visits.length, color: "#10B981" },
            { label: "Total Prescriptions", val: prescriptions.length, color: "#8B5CF6" },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl px-4 py-3 relative overflow-hidden"
              style={{ border: "0.5px solid #E5E7EB" }}
            >
              <div
                className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl"
                style={{ background: stat.color }}
              />
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-semibold text-gray-900">{stat.val}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div
          className="bg-white rounded-lg px-4 py-2.5 flex items-center gap-3"
          style={{ border: "0.5px solid #E5E7EB" }}
        >
          <svg width="14" height="14" fill="none" stroke="#C4C9D4" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="22" y2="22" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, phone, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-300"
          />
        </div>

        {/* Table Container */}
        <div
          className="bg-white rounded-xl flex-1 flex flex-col min-h-0 overflow-x-auto"
          style={{ border: "0.5px solid #E5E7EB" }}
        >
          {/* Header */}
          <div
            className="grid px-5 py-2.5 bg-gray-50 flex-shrink-0 min-w-[1000px]"
            style={{
              gridTemplateColumns: "2fr 0.6fr 0.5fr 1fr 1.5fr 1fr 1.5fr",
              borderBottom: "0.5px solid #E5E7EB",
            }}
          >
            {["Patient", "Sex", "Age", "Birthdate", "Address", "Phone", "Email"].map((h) => (
              <div key={h} className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {h}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 min-w-[1000px]">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                Loading dashboard...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <svg width="40" height="40" fill="none" stroke="#D1D5DB" strokeWidth="1.2" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <p className="text-sm text-gray-400">
                  {search ? "No matches." : "No patients found."}
                </p>
              </div>
            ) : (
              filtered.map((patient) => (
                <div
                  key={patient.patient_id}
                  className="grid px-5 py-3 items-center hover:bg-gray-50 transition-colors"
                  style={{
                    gridTemplateColumns: "2fr 0.6fr 0.5fr 1fr 1.5fr 1fr 1.5fr",
                    borderBottom: "0.5px solid #F3F4F6",
                  }}
                >
                  {/* Patient */}
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ background: getColor(patient.first_name) }}
                    >
                      {initials(patient.first_name, patient.last_name)}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fullName(patient)}
                      </p>
                      <p className="text-xs text-gray-300">#{patient.patient_id}</p>
                    </div>
                  </div>

                  {/* Sex */}
                  <div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={
                        patient.sex?.startsWith("F")
                          ? { background: "#FCE7F3", color: "#BE185D" }
                          : { background: "#DBEAFE", color: "#1D4ED8" }
                      }
                    >
                      {patient.sex || "—"}
                    </span>
                  </div>

                  {/* Age */}
                  <p className="text-sm text-gray-700">{patient.calculated_age ?? "—"}</p>

                  {/* Birthdate */}
                  <p className="text-sm text-gray-700">{formatDate(patient.birthdate)}</p>

                  {/* Address */}
                  <p className="text-sm text-gray-400 truncate pr-4" title={patient.address}>
                    {patient.address || "—"}
                  </p>

                  {/* Phone */}
                  <p className="text-sm text-gray-400">{patient.phone_no || "—"}</p>

                  {/* Email */}
                  <p className="text-sm text-gray-400 truncate" title={patient.email}>
                    {patient.email || "—"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}