import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    srn: { type: Number, unique: true, index: true },
    name: { type: String, required: true, index: true },
    manager: { type: String },
    designation: { type: String },
    department: { type: String },
    officeNo: { type: String },
    email: { type: String }
  },
  { timestamps: true }
);

// Text index for name/department/designation search
employeeSchema.index({
  name: "text",
  department: "text",
  designation: "text",
  manager: "text"
});

export default mongoose.model("Employee", employeeSchema);
