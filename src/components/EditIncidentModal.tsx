import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { auth } from "@/lib/firebase";
import { IncidentCategory } from '@/types';
import { BARMM_PROVINCES, SEVERITY_LEVELS } from "@/types";

export type IncidentReport = {
	id: string | number,

	title: string,
    description: string,
    incident_type: string,
    severity: string,
    province: string,
    municipality: string,
    incident_date: string,
    incident_time: string,
    organization: string,
    contact_info: string,
	reported_by: string,
	category: string,
};

type EditIncidentModalProps = {
  incident: IncidentReport | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (incident: IncidentReport) => void | Promise<void>;
};

export default function EditIncidentModal({
  incident,
  isOpen,
  onClose,
  onSave,
}: EditIncidentModalProps) {
	const [form, setForm] = useState<IncidentReport | null>(incident);
	const [saving, setSaving] = useState(false);

	const [categories, setCategories] = useState<IncidentCategory[]>([]);	

	const API_URL = import.meta.env.VITE_API_URL;

	// Update form whenever a different incident is selected
	useEffect(() => {
		setForm(incident);
	}, [incident]);

	const fetchCategories = async () => {
		try {
		const token = await auth.currentUser?.getIdToken();
		const response = await fetch(`${API_URL}/admin/categories`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) throw new Error("Failed to fetch categories");
		const data = await response.json();
		setCategories(data);
		} catch (error) {
		console.error("Error fetching categories:", error);
		}
	};

	useEffect(() => {
		fetchCategories();
	}, []);

  // Close modal with Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !form) return null;

  const updateField = (
    field: keyof IncidentReport,
    value: string
  ) => {
    setForm((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    );
  };
  

  const handleSubmit = async (
	event: FormEvent<HTMLFormElement>
	) => {
	event.preventDefault();

	setSaving(true);

	try {
		await onSave(form);
		onClose();
	} catch (error) {
		console.error("Failed to update incident:", error);
	} finally {
		setSaving(false);
	}
	};

	return createPortal(
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="edit-incident-title"
			style={styles.backdrop}
			onMouseDown={(event) => {
			if (event.target === event.currentTarget) {
				onClose();
			}
			}}
		>
			<form
			onSubmit={handleSubmit}
			style={styles.modal}
			>
			{/* Header */}
			<div style={styles.header}>
				<div>
				<h2 id="edit-incident-title" style={styles.title}>
					Edit Incident Report
				</h2>

				<p style={styles.subtitle}>
					Update the details of this incident report.
				</p>
				</div>

				<button
				type="button"
				onClick={onClose}
				aria-label="Close"
				style={styles.closeButton}
				>
				×
				</button>
			</div>

			{/* Title */}
			<label style={styles.label}>
				Incident Title

				<input
				required
				value={form.title ?? ""}
				onChange={(event) =>
					updateField("title", event.target.value)
				}
				style={styles.input}
				/>
			</label>

			{/* Description */}
			<label style={styles.label}>
				Description

				<textarea
				required
				rows={5}
				value={form.description ?? ""}
				onChange={(event) =>
					updateField("description", event.target.value)
				}
				style={styles.textarea}
				/>
			</label>

			{/* Category + Severity */}
			<div style={styles.row}>
				<label style={styles.label}>
				Category

				<select
					value={form.category ?? ""}
					onChange={(event) =>
					updateField("category", event.target.value)
					}
					style={styles.input}
				>
					<option value="">Select category</option>

					{categories.map((category) => (
					<option
						key={category.name}
						value={category.name}
					>
						{category.name}
					</option>
					))}
				</select>
				</label>

				<label style={styles.label}>
				Severity

				<select
					value={form.severity ?? ""}
					onChange={(event) =>
					updateField("severity", event.target.value)
					}
					style={styles.input}
				>
					<option value="">Select severity</option>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
					<option value="critical">Critical</option>
				</select>
				</label>
			</div>

			{/* Location */}
			<div style={styles.row}>
				<label style={styles.label}>
				Province

					<select
						value={form.province ?? ""}
						onChange={(event) =>
							updateField("province", event.target.value)
						}
						className="input-field cursor-pointer"
						style={styles.input}
						>
							<option value="">Select Province</option>
							{BARMM_PROVINCES.map((prov) => (
							<option key={prov} value={prov}>{prov}</option>
							))}
					</select>
				</label>

				<label style={styles.label}>
				Municipality

				<input
					value={form.municipality ?? ""}
					onChange={(event) =>
					updateField("municipality", event.target.value)
					}
					style={styles.input}
				/>
				</label>
			</div>

			{/* Date + Time */}
			<div style={styles.row}>
				<label style={styles.label}>
				Incident Date

				<input
					type="date"
					value={(form.incident_date ?? "").slice(0, 10)}
					onChange={(event) =>
					updateField("incident_date", event.target.value)
					}
					style={styles.input}
				/>
				</label>

				<label style={styles.label}>
				Incident Time

				<input
					type="time"
					value={(form.incident_time ?? "").slice(0, 5)}
					onChange={(event) =>
					updateField("incident_time", event.target.value)
					}
					style={styles.input}
				/>
				</label>
			</div>

			{/* Actions */}
			<div style={styles.actions}>
				<button
				type="button"
				onClick={onClose}
				disabled={saving}
				className="bg-white text-sm text-gray-700 px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 transition-colors duration-200"
				>
				Cancel
				</button>

				<button
				type="submit"
				disabled={saving}
				className="bg-primary text-sm text-white px-3 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors duration-200"
				>
				{saving ? "Saving..." : "Save Changes"}
				</button>
			</div>
			</form>
		</div>,
		document.body
	);
}


const styles: Record<string, React.CSSProperties> = {
	backdrop: {
		position: "fixed",
		inset: 0,
		zIndex: 999999,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		padding: 16,
		background: "rgba(0,0,0,.55)",
		overflow: "hidden", // backdrop does NOT scroll
	},

	modal: {
		width: "min(100%, 700px)",
		maxHeight: "85vh",
		overflowY: "auto", // ✅ scrollbar is inside the white modal
		overflowX: "hidden",
		padding: 24,
		borderRadius: 8,
		background: "#fff",
		boxShadow: "0 20px 60px rgba(0,0,0,.4)",
	},

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },

  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#1e293b",
  },

  subtitle: {
    margin: "6px 0 0",
    fontSize: 14,
    color: "#64748b",
  },

  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: 30,
    lineHeight: 1,
    cursor: "pointer",
    color: "#64748b",
  },

  label: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    marginBottom: 16,
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
    color: "#334155",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 7,
    fontSize: 14,
	fontWeight: 400,
    outline: "none",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 7,
    fontSize: 14,
    fontWeight: 400,
    resize: "vertical",
    fontFamily: "inherit",
  },

  row: {
    display: "flex",
    gap: 16,
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 18,
  },

  cancelButton: {
    padding: "10px 18px",
    border: "1px solid #cbd5e1",
    borderRadius: 7,
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 600,
  },

  saveButton: {
    padding: "10px 18px",
    border: "none",
    borderRadius: 7,
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 600,
  },
};