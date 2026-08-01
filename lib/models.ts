import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const ROLES = ["director", "employee", "ngo"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIVITY_CATEGORIES = [
  "computer-class",
  "education",
  "social-service",
  "health-hygiene",
  "sports",
  "skill-development",
  "other",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_STATUSES = ["scheduled", "in-progress", "completed", "cancelled"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

/* ── User (director / employee / ngo) ─────────────────── */

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, index: true },
    phone: { type: String, trim: true },
    designation: { type: String, trim: true }, // employees
    org: {
      // NGO users
      orgName: { type: String, trim: true },
      regNo: { type: String, trim: true },
      address: { type: String, trim: true },
      contactPerson: { type: String, trim: true },
    },
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

/* ── Project ──────────────────────────────────────────── */

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["active", "completed", "on-hold"], default: "active" },
    coverKey: { type: String }, // R2 object key
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

/* ── School ───────────────────────────────────────────── */

const SchoolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true },
    contactName: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    photoKey: { type: String },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

/* ── Activity (a scheduled engagement) ────────────────── */

const PointSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
    remark: { type: String, trim: true },
  },
  { _id: true }
);

const ActivitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: ACTIVITY_CATEGORIES, default: "other" },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    ngo: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true }, // "HH:mm"
    durationMinutes: { type: Number, required: true, min: 15 },
    venue: { type: String, trim: true },
    description: { type: String, trim: true },
    points: [PointSchema],
    status: { type: String, enum: ACTIVITY_STATUSES, default: "scheduled", index: true },
    completionNote: { type: String, trim: true },
    photoKeys: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

type WithMeta = { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };

export type UserDoc = InferSchemaType<typeof UserSchema> & WithMeta;
export type ProjectDoc = InferSchemaType<typeof ProjectSchema> & WithMeta;
export type SchoolDoc = InferSchemaType<typeof SchoolSchema> & WithMeta;
export type ActivityDoc = InferSchemaType<typeof ActivitySchema> & WithMeta;

export const User: Model<UserDoc> = mongoose.models.User ?? mongoose.model("User", UserSchema);
export const Project: Model<ProjectDoc> =
  mongoose.models.Project ?? mongoose.model("Project", ProjectSchema);
export const School: Model<SchoolDoc> =
  mongoose.models.School ?? mongoose.model("School", SchoolSchema);
export const Activity: Model<ActivityDoc> =
  mongoose.models.Activity ?? mongoose.model("Activity", ActivitySchema);
