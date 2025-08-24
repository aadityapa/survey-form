// importEmployees.js
import mongoose from "mongoose";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import Employee from "./models/Employee.js"; // make sure this path is correct

dotenv.config();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => {
  console.error("❌ MongoDB connection error:", err.message);
  process.exit(1);
});

// Load Excel file
function loadExcel(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  return rows.map((r) => ({
    srn: Number(r["SRN"]) || undefined,
    name: (r["EMPLOYEE NAME"] || "").toString().trim(),
    manager: (r["Reporting Manager/TL"] || "").toString().trim(),
    designation: (r["DESIGNATION"] || "").toString().trim(),
    department: (r["DEPARTMENT"] || "").toString().trim(),
    officeNo: (r["OFFICE NO"] || "").toString().trim(),
    email: (r["Offical mail Id"] || "").toString().trim(),
  }));
}

// Main import function
async function main() {
  try {
    const filePath = path.join(process.cwd(), "employees.xlsx"); // make sure this file exists
    console.log("📄 Loading", filePath);
    const data = loadExcel(filePath);

    console.log(`🔹 Found ${data.length} rows, inserting into MongoDB...`);

    for (const emp of data) {
      await Employee.updateOne(
        { srn: emp.srn },
        { $set: emp },
        { upsert: true } // insert if not exist
      );
    }

    console.log("✅ Employees imported successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

main();
