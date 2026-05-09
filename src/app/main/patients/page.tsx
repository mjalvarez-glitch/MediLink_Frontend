"use client";

import React, { useState, useEffect } from "react";
import { API_BASE } from "../../../lib/config";
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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>(emptyContact);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);

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
          console.log(`🔍 Trying URL: ${url}`);
          const res = await fetchWithAuth(url);
          const result = await res.json();

          console.log(` Response from ${url}:`, {
            ok: res.ok,
            status: res.status,
            dataLength: Array.isArray(result.data) ? result.data.length : result.length || 0,
            total: result.total || result.count || "unknown",
            resultKeys: Object.keys(result),
          });

          if (res.ok) {
            if (Array.isArray(result.data)) {
              allPatients = result.data;
            } else if (Array.isArray(result)) {
              allPatients = result;
            } else if (result.patients && Array.isArray(result.patients)) {
              allPatients = result.patients;
            }

            if (allPatients.length > 0) {
              console.log(` Found ${allPatients.length} patients from ${url}`);
              break;
            }
          }
        } catch (urlErr) {
          console.log(` URL failed: ${url}`, urlErr);
          continue;
        }
      }

      setPatients(allPatients);
      console.log(` Final patient count: ${allPatients.length}`);
    } catch (err) {
      console.error(" Failed to fetch patients:", err);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmergencyContact = async (patientId: number) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/emergency_contact_info/patients/${patientId}`);
      const data = await res.json();
      console.log("Fetched EC raw:", JSON.stringify(data));

      if (Array.isArray(data) && data.length > 0) {
        const contact = data[0];
        console.log("EC contact keys:", Object.keys(contact));
        setEmergencyContact({
          contact_id: contact.contact_id ?? contact.id ?? contact.emergency_contact_id,
          person_name: contact.person_name || "",
          relationship: contact.relationship || "",
          phone_no: contact.phone_no || "",
        });
      } else {
        setEmergencyContact(emptyContact);
      }
    } catch (err) {
      console.error("Failed to fetch EC:", err);
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

  const handleSave = async () => {
    setSaving(true);
    setModalError("");

    try {
      let patientSuccess = false;
      let newPatientId: number | null = null;

      if (mode === "add") {
        const res = await fetchWithAuth(`${API_BASE}/patients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        console.log("Patient create response:", data);

        if (!res.ok) {
          setModalError(data.message || "Failed to create patient.");
          return;
        }

        newPatientId =
          data.patient_id ?? data.data?.patient_id ?? data.id ?? data.data?.id;
        patientSuccess = true;
        console.log("New patient ID:", newPatientId);
      } else if (mode === "edit" && selectedPatient) {
        const res = await fetchWithAuth(
          `${API_BASE}/patients/${selectedPatient.patient_id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          },
        );
        const data = await res.json();
        console.log("Patient update response:", data);

        if (!res.ok) {
          setModalError(data.message || "Failed to update patient.");
          return;
        }

        newPatientId = selectedPatient.patient_id;
        patientSuccess = true;
      }

      if (patientSuccess && newPatientId) {
        const hasCompleteEC =
          emergencyContact.person_name?.trim() &&
          emergencyContact.relationship?.trim() &&
          emergencyContact.phone_no?.trim();

        if (hasCompleteEC) {
          const contactPayload = {
            patient_id: newPatientId,
            person_name: emergencyContact.person_name.trim(),
            relationship: emergencyContact.relationship.trim(),
            phone_no: emergencyContact.phone_no.trim(),
          };

          try {
            if (emergencyContact.contact_id) {
              await fetchWithAuth(
                `${API_BASE}/emergency_contact_info/${emergencyContact.contact_id}`,
                {
                  method: "DELETE",
                },
              );
            }

            const ecRes = await fetchWithAuth(
              `${API_BASE}/emergency_contact_info`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contactPayload),
              },
            );

            if (ecRes.ok) {
              console.log("Emergency contact saved successfully");
            } else {
              console.warn("Patient saved, EC failed:", await ecRes.text());
            }
          } catch (ecErr) {
            console.error("EC save error:", ecErr);
          }
        } else if (emergencyContact.contact_id) {
          try {
            await fetchWithAuth(
              `${API_BASE}/emergency_contact_info/${emergencyContact.contact_id}`,
              {
                method: "DELETE",
              },
            );
            console.log(
              "Old emergency contact deleted (no new data provided)",
            );
          } catch (delErr) {
            console.error("EC delete error:", delErr);
          }
        }
      }

      await fetchPatients();
      setShowModal(false);
    } catch (err: any) {
      console.error("Save error:", err);
      setModalError(err.message || "Connection error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPatient) return;
    setDeleting(true);
    try {
      const ecRes = await fetchWithAuth(
        `${API_BASE}/emergency_contact_info/patients/${deletingPatient.patient_id}`
      );
      if (ecRes.ok) {
        const ecData = await ecRes.json();
        if (Array.isArray(ecData) && ecData.length > 0) {
          const contactId = ecData[0].contact_id ?? ecData[0].id;
          if (contactId) {
            console.log("Deleting EC first:", contactId);
            await fetchWithAuth(`${API_BASE}/emergency_contact_info/${contactId}`, {
              method: "DELETE",
            });
          }
        }
      }

      const res = await fetchWithAuth(`${API_BASE}/patients/${deletingPatient.patient_id}`, {
        method: "DELETE",
      });

      console.log("DELETE patient status:", res.status);

      if (res.ok || res.status === 204) {
        await fetchPatients();
        setShowDeleteConfirm(false);
        setDeletingPatient(null);
      } else {
        const body = await res.text();
        console.error("Delete patient failed:", res.status, body);
      }
    } catch (err) {
      console.error("Failed to delete patient:", err);
    } finally {
      setDeleting(false);
    }
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
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const inputClass = (disabled: boolean) =>
    `w-full border rounded-lg px-3 py-2 text-sm outline-none transition ${
      disabled ? "bg-gray-50 text-gray-500" : "bg-white text-gray-900 focus:border-blue-500"
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
          <h1 className="text-xl font-semibold text-gray-900">Patients</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage and track all registered patients
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
          Add Patient
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
        {/* Stat card */}
        <div className="grid grid-cols-4 gap-3">
          <div
            className="bg-white rounded-xl px-4 py-3 relative overflow-hidden"
            style={{ border: "0.5px solid #E5E7EB" }}
          >
            <div
              className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl"
              style={{ background: "#3B82F6" }}
            />
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
              Total Patients
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {patients.length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div
          className="bg-white rounded-lg px-4 py-2.5 flex items-center gap-3"
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
            placeholder="Search by name, email, phone, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-300"
          />
        </div>

        {/* Table */}
        <div
          className="bg-white rounded-xl flex-1 flex flex-col min-h-0"
          style={{ border: "0.5px solid #E5E7EB" }}
        >
          <div
            className="grid px-5 py-2.5 bg-gray-50 rounded-t-xl flex-shrink-0"
            style={{
              gridTemplateColumns: "2fr .5fr .4fr 1fr 1.3fr .9fr 1.2fr .8fr",
              borderBottom: "0.5px solid #E5E7EB",
            }}
          >
            {[
              "Patient",
              "Sex",
              "Age",
              "Birthdate",
              "Address",
              "Phone",
              "Email",
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

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                Loading patients...
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
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <p className="text-sm text-gray-400">
                  {search
                    ? "No patients match your search."
                    : "No patients yet. Add one to get started."}
                </p>
              </div>
            ) : (
              filtered.map((patient) => (
                <div
                  key={patient.patient_id}
                  className="grid px-5 py-3 items-center hover:bg-gray-50 transition-colors"
                  style={{
                    gridTemplateColumns:
                      "2fr .5fr .4fr 1fr 1.3fr .9fr 1.2fr .8fr",
                    borderBottom: "0.5px solid #F3F4F6",
                  }}
                >
                  {/* Patient */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ background: getColor(patient.first_name) }}
                    >
                      {initials(patient.first_name, patient.last_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fullName(patient)}
                      </p>
                      <p className="text-xs text-gray-300">
                        #{patient.patient_id}
                      </p>
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

                  <p className="text-sm text-gray-700">
                    {patient.calculated_age ?? "—"}
                  </p>
                  <p className="text-sm text-gray-700">
                    {formatDate(patient.birthdate)}
                  </p>
                  <p className="text-sm text-gray-400 truncate">
                    {patient.address || "—"}
                  </p>
                  <p className="text-sm text-gray-400">
                    {patient.phone_no || "—"}
                  </p>
                  <p className="text-sm text-gray-400 truncate">
                    {patient.email || "—"}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenModal(patient, "view")}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                      style={{ border: "0.5px solid #E5E7EB" }}
                      title="View"
                    >
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="4" />
                        <path d="M2 12C4.5 6 8.5 3 12 3s7.5 3 10 9c-2.5 6-6.5 9-10 9s-7.5-3-10-9z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleOpenModal(patient, "edit")}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                      style={{ border: "0.5px solid #E5E7EB" }}
                      title="Edit"
                    >
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setDeletingPatient(patient);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      style={{ border: "0.5px solid #E5E7EB" }}
                      title="Delete"
                    >
                      <svg
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
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

      {/* Patient Modal */}
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
                {mode === "view"
                  ? "Patient Profile"
                  : mode === "edit"
                    ? "Edit Patient"
                    : "Add Patient"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-5 max-h-[75vh]">
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                  Patient Details
                </p>

                {/* Row 1: First Name + Middle Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      First Name <span className = "required text-red-500">*</span>
                    </label>
                    <input
                      placeholder="First Name"
                      required
                      disabled={mode === "view"}
                      value={form.first_name}
                      onChange={(e) =>
                        setForm({ ...form, first_name: e.target.value })
                      }
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Middle Name{" "}
                      <span className="text-gray-300">(optional)</span>
                    </label>
                    <input
                      placeholder="Middle Name"
                      disabled={mode === "view"}
                      value={form.middle_name}
                      onChange={(e) =>
                        setForm({ ...form, middle_name: e.target.value })
                      }
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                </div>

                {/* Row 2: Last Name (full width, optional) */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Last Name <span className = "required text-red-500">*</span>
                  </label>
                  <input
                    placeholder="Last Name"
                    required
                    disabled={mode === "view"}
                    value={form.last_name}
                    onChange={(e) =>
                      setForm({ ...form, last_name: e.target.value })
                    }
                    className={inputClass(mode === "view")}
                    style={{ border: "0.5px solid #E5E7EB" }}
                  />
                </div>

                {/* Row 3: Birthdate + Sex */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Birthdate <span className = "required text-red-500">*</span>
                    </label>
                    <input
                      type={mode === "view" ? "text" : "date"}
                      required
                      disabled={mode === "view"}
                      value={
                        mode === "view"
                          ? formatDate(form.birthdate)
                          : form.birthdate
                      }
                      onChange={(e) =>
                        setForm({ ...form, birthdate: e.target.value })
                      }
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Sex <span className = "required text-red-500">*</span>
                    </label>
                    {mode === "view" ? (
                      <input
                        disabled
                        required
                        value={form.sex}
                        className={inputClass(true)}
                        style={{ border: "0.5px solid #E5E7EB" }}
                      />
                    ) : (
                      <select
                        value={form.sex}
                        onChange={(e) =>
                          setForm({ ...form, sex: e.target.value })
                        }
                        className={inputClass(false)}
                        style={{ border: "0.5px solid #E5E7EB" }}
                      >
                        <option value="">Select Sex</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Row 4: Address */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Address <span className = "required text-red-500">*</span>
                  </label>
                  <input
                    placeholder="Address"
                    required
                    disabled={mode === "view"}
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    className={inputClass(mode === "view")}
                    style={{ border: "0.5px solid #E5E7EB" }}
                  />
                </div>

                {/* Row 5: Phone + Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Phone <span className = "required text-red-500">*</span>
                    </label>
                    <input
                      placeholder="Phone Number"
                      required
                      disabled={mode === "view"}
                      value={form.phone_no}
                      onChange={(e) =>
                        setForm({ ...form, phone_no: e.target.value })
                      }
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Email
                    </label>
                    <input
                      placeholder="Email"
                      disabled={mode === "view"}
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div
                className="flex flex-col gap-3 pt-4"
                style={{ borderTop: "0.5px dashed #E5E7EB" }}
              >
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                  Emergency Contact
                </p>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Contact Person <span className = "required text-red-500">*</span>
                  </label>
                  <input
                    placeholder="Full Name"
                    required
                    disabled={mode === "view"}
                    value={emergencyContact.person_name}
                    onChange={(e) =>
                      setEmergencyContact({
                        ...emergencyContact,
                        person_name: e.target.value,
                      })
                    }
                    className={inputClass(mode === "view")}
                    style={{ border: "0.5px solid #E5E7EB" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Relationship <span className = "required text-red-500">*</span>
                    </label>
                    <input
                      placeholder="e.g. Spouse, Parent"
                      required
                      disabled={mode === "view"}
                      value={emergencyContact.relationship}
                      onChange={(e) =>
                        setEmergencyContact({
                          ...emergencyContact,
                          relationship: e.target.value,
                        })
                      }
                      className={inputClass(mode === "view")}
                      style={{ border: "0.5px solid #E5E7EB" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Phone <span className = "required text-red-500">*</span>
                    </label>
                    <input
                      placeholder="Phone Number"
                      required
                      disabled={mode === "view"}
                      value={emergencyContact.phone_no}
                      onChange={(e) =>
                        setEmergencyContact({
                          ...emergencyContact,
                          phone_no: e.target.value,
                        })
                      }
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
              style={{
                borderTop: "0.5px solid #E5E7EB",
                background: "#F9FAFB",
              }}
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
                  {saving
                    ? "Saving..."
                    : mode === "edit"
                      ? "Save Changes"
                      : "Register Patient"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && deletingPatient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6 flex flex-col gap-4"
            style={{ border: "0.5px solid #E5E7EB" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Delete Patient
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-gray-700">
                    {fullName(deletingPatient)}
                  </span>
                  ? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingPatient(null);
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