import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import XLSX from "xlsx";

import Employee from "./models/Employee.js";
import Submission from "./models/Submission.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve static files
const PUBLIC_DIR = path.join(__dirname, "public");
app.use(express.static(PUBLIC_DIR));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) console.error("❌ MONGO_URI missing in .env");

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 6000 })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err.message));

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Employee search
app.get("/api/employees", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      const latest = await Employee.find().sort({ updatedAt: -1 }).limit(10);
      return res.json(latest);
    }

    const byText = await Employee.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(20);

    if (byText.length) return res.json(byText);

    const byRegex = await Employee.find({
      name: { $regex: q, $options: "i" },
    })
      .sort({ name: 1 })
      .limit(20);

    res.json(byRegex);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Search failed" });
  }
});

// Get employee by SRN
app.get("/api/employees/:srn", async (req, res) => {
  try {
    const emp = await Employee.findOne({ srn: Number(req.params.srn) });
    if (!emp) return res.status(404).json({ error: "Not found" });
    res.json(emp);
  } catch {
    res.status(500).json({ error: "Query failed" });
  }
});

// Create submission (extended for Step 3)
app.post("/api/submissions", async (req, res) => {
  try {
    const {
      employeeSrn,
      employeeName,
      manager,
      designation,
      department,
      managerVerified,
      designationVerified,
      departmentVerified,
      choice,
      comments,
      workingMode,
      userType,
      device,
      clientAccess,
      emailAccess,
      platformAccess,
      pendriveAccess,
    } = req.body;

    if (!employeeName) return res.status(400).json({ error: "employeeName is required" });
    if (!choice) return res.status(400).json({ error: "choice is required" });

    const doc = await Submission.create({
      employeeSrn: employeeSrn ? Number(employeeSrn) : undefined,
      employeeName,
      manager,
      designation,
      department,
      managerVerified: !!managerVerified,
      designationVerified: !!designationVerified,
      departmentVerified: !!departmentVerified,
      choice,
      comments,
      workingMode,
      userType,
      device,
      clientAccess: clientAccess || [],
      emailAccess: emailAccess || [],
      platformAccess: platformAccess || [],
      pendriveAccess,
    });

    res.status(201).json({ ok: true, submissionId: doc._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Submit failed" });
  }
});

// List submissions
app.get("/api/submissions", async (req, res) => {
  const limit = Number(req.query.limit || 100);
  const rows = await Submission.find().sort({ createdAt: -1 }).limit(limit);
  res.json(rows);
});

// Delete all submissions (admin only)
app.delete("/api/submissions", async (req, res) => {
  try {
    await Submission.deleteMany({});
    res.json({ ok: true, message: "All submissions deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete submissions" });
  }
});

// Export submissions to Excel
app.get("/api/submissions/export", async (req, res) => {
  try {
    const submissions = await Submission.find().lean();
    const data = submissions.map(s => ({
      "Employee SRN": s.employeeSrn,
      "Employee Name": s.employeeName,
      "Manager": s.manager,
      "Designation": s.designation,
      "Department": s.department,
      "Manager Verified": s.managerVerified,
      "Designation Verified": s.designationVerified,
      "Department Verified": s.departmentVerified,
      "Choice": s.choice,
      "Comments": s.comments,
      "Working Mode": s.workingMode,
      "User Type": s.userType,
      "Device": s.device,
      "Client Access": s.clientAccess.join(", "),
      "Email Access": s.emailAccess.join(", "),
      "Platform Access": s.platformAccess.map(p => `${p.name}: ${p.description}`).join("; "),
      "Pendrive Access": s.pendriveAccess,
      "Submitted At": s.createdAt
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Submissions");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="submissions_${Date.now()}.xlsx"`
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
});

// Verified submissions
app.get("/api/submissions/verified", async (req, res) => {
  try {
    const rows = await Submission.find({
      managerVerified: true,
      designationVerified: true,
      departmentVerified: true,
    }).sort({ createdAt: -1 });

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Report failed" });
  }
});

// Serve admin page
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

// SPA fallback for other routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

export default app;

// Listen on all network interfaces for LAN access
const port = process.env.PORT || 8001;
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${port} and http://10.20.30.100:${port}`);
});
