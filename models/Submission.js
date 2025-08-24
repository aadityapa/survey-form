import mongoose from "mongoose";

// Sub-schema for platform access
const platformAccessSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g., "Social Media", "AI Platform"
  description: { type: String, default: "" }   // optional description
}, { _id: false });

const submissionSchema = new mongoose.Schema(
  {
    employeeSrn: { type: Number },
    employeeName: { type: String, required: true },

    // Editable fields
    manager: { type: String },
    designation: { type: String },
    department: { type: String },

    // Verification flags
    managerVerified: { type: Boolean, default: false },
    designationVerified: { type: Boolean, default: false },
    departmentVerified: { type: Boolean, default: false },

    choice: { type: String, default: "" },
    comments: { type: String, default: "" },

    // --- Step 3 Fields ---
    workingMode: { type: String, enum: ["WFH", "On-Site", "Client-Site"] },
    userType: { type: String, enum: ["Contractual", "Permanent"] },
    device: { type: String, enum: ["Laptop", "Desktop"] },

    clientAccess: [{ type: String }], // multi-choice
    emailAccess: [{ type: String }],  // multi-choice

    platformAccess: [platformAccessSchema], // array of platform objects

    pendriveAccess: { type: String, enum: ["Yes", "No"] },
  },
  { timestamps: true }
);

const Submission = mongoose.model("Submission", submissionSchema);

export default Submission;

// Optional helper for deletion (can be used in routes)
export async function deleteAllSubmissions() {
  return await Submission.deleteMany({});
}
