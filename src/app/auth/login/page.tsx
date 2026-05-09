"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveToken, saveRefreshToken } from '../../../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

import { AUTH_BASE } from '../../../lib/config';
import { FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Doctor');
  
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    alert("Form submitted!");
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? `${AUTH_BASE}/register` : `${AUTH_BASE}/login`;
    
    const body = isRegistering 
      ? { username, password, full_name: fullName, role } 
      : { username, password };

    console.log("Submit triggered! Mode:", isRegistering ? "Register" : "Login");
    console.log("Sending to:", endpoint);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Action failed');
        setLoading(false);
        return;
      }

      if (isRegistering) {
        alert("Registration successful! Please log in.");
        setIsRegistering(false);
        setLoading(false);
      } else {
        saveToken(data.accessToken);
        saveRefreshToken(data.refreshToken);
        window.location.href = '/main/dashboard';
      }
    } catch (err) {
      setError("Connection error");
      setLoading(false); 
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{ background: "#0D1117" }}
      >
        {/* decorative blobs */}
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "rgba(59,130,246,0.08)" }}
        />
        <div
          className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "rgba(139,92,246,0.07)" }}
        />

        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />

            <span
              className="text-white text-3xl font-semibold"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              MediLink
            </span>
          </div>

          <p
            className="text-5xs tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Barangay Clinic Management
          </p>
        </div>

        {/* Headline */}
        <div className="flex-1 flex flex-col justify-center py-10">
          <h1
            className="text-5xl leading-snug text-white mb-3"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            Your clinic,
            <br />
            fully connected.
          </h1>

          <p
            className="text-5xs leading-relaxed"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Manage patients, visits, and prescriptions all in one place.
          </p>
        </div>

        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          © 2026 MediLink. All rights reserved.
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-2 h-2 rounded-full bg-blue-500" />

            <span
              className="text-gray-900 text-lg font-semibold"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              MediLink
            </span>
          </div>

          <h2
            className="text-2xl font-semibold text-gray-900 mb-1"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            Welcome!
          </h2>

          <p className="text-sm text-gray-500 mb-7">
            Sign in to your MediLink account
          </p>

          <form onSubmit={handleSubmit} method="POST" className="flex flex-col gap-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    //required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 outline-none focus:border-blue-500 transition"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Receptionist">Receptionist</option>
                  </select>
                </div>
              </>
            )}

            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                User address
              </label>
              <input
                type="text"
                //required
                value={username}
                name="username"
                onChange={(e) => setUsername(e.target.value)}
                placeholder="jdoe"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  //required
                  value={password}
                  name="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-150 mt-1 disabled:opacity-70"
              style={{ background: loading ? "#93C5FD" : "#3B82F6" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin"
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="white"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="white"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  {isRegistering ? "Creating account..." : "Signing in..."}
                </span>
              ) : isRegistering ? (
                "Register"
              ) : (
                "Sign in"
              )}
            </button>

            <p className="text-center text-xs text-gray-500 mt-4">
              {isRegistering ? "Already have an account?" : "New to MediLink?"}{" "}
              <button
                type="button"
                onClick={() => {
                  const nextMode = !isRegistering; // Determine the new mode first
                  setIsRegistering(nextMode);
                  setError("");

                  // If we are moving TO login mode (nextMode is false), clear the fields
                  if (!nextMode) {
                    setFullName("");
                    setRole("Doctor");
                  }
                }}
                className="text-blue-500 font-semibold hover:underline"
              >
                {isRegistering ? "Sign In" : "Create Account"}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
