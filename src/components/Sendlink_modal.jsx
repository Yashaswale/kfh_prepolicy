import { useState } from "react";
import { sendInspectionLink } from "../api";

const SendLinkModal = ({ onClose }) => {
  const [type, setType] = useState("vehicle");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    policy: "",
    claim: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!form.name || !form.email || !form.phone) {
      setError("Please fill in all required fields (Name, Email, Phone).");
      return;
    }

    const payload = {
      type,
      customer_name: form.name,
      phone_number: form.phone,
      email: form.email,
      policy_number: form.policy,
      claim_number: form.claim,
    };

    setLoading(true);
    try {
      await sendInspectionLink(payload);
      setSuccess("Link sent successfully.");
      // Close after a short delay so user can see success
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      const msg =
        err?.data?.detail ||
        err?.data?.error ||
        "Failed to send link. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const types = [
    { id: "vehicle", label: "Vehicle Inspection" },
    { id: "motor", label: "Motor Claim" },
    { id: "windshield", label: "Wind Shield Claim" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <h2 className="text-[17px] font-semibold text-gray-900 tracking-tight">
              Send Link to Customer
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Type selector */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-3">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-nowrap gap-3">
              {types.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all text-sm font-medium select-none ${type === t.id
                      ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.id}
                    checked={type === t.id}
                    onChange={() => setType(t.id)}
                    className="sr-only"
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${type === t.id ? "border-white" : "border-gray-400"
                      }`}
                  >
                    {type === t.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                    )}
                  </span>
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Fields */}
          {[
            {
              id: "name",
              label: "Name of the Customer",
              placeholder: "Enter full name",
              type: "text",
              required: true,
            },
            {
              id: "email",
              label: "Customer Email Address",
              placeholder: "Enter email",
              type: "email",
              required: true,
            },
            {
              id: "phone",
              label: "Customer Phone Number",
              placeholder: "Enter phone no",
              type: "tel",
              required: true,
            },
            {
              id: "policy",
              label: "Customer Policy Number",
              placeholder: "Enter policy number",
              type: "text",
              required: false,
            },
            {
              id: "claim",
              label: "Claim Number",
              placeholder: "Enter claim number",
              type: "text",
              required: false,
            },
          ].map((field) => (
            <div key={field.id}>
              <label
                htmlFor={field.id}
                className="block text-[13px] font-semibold text-gray-700 mb-1.5"
              >
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                id={field.id}
                name={field.id}
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.id]}
                onChange={handleChange}
                className="w-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
              />
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-600">
              {success}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-sm shadow-green-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Link"}
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default SendLinkModal;