import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const ROLES = ["director", "employee", "ngo"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Bata employee code format. The HR master uses 4-digit numeric codes (e.g.
 * 3146); older self-registered accounts used prefixed codes (e.g. BATA-10234),
 * so both are accepted. Employees sign in with this code.
 */
export const EMPLOYEE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/-]{2,19}$/;
export const EMPLOYEE_CODE_HINT = "3–20 letters, digits, hyphens or slashes (e.g. 3146 or BATA-10234)";

export const ACTIVITY_CATEGORIES = [
  "computer-class",
  "education",
  "health-hygiene",
  "menstrual-hygiene",
  "distribution",
  "awareness-camp",
  "social-service",
  "sports",
  "skill-development",
  "other",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_STATUSES = ["scheduled", "in-progress", "completed", "cancelled"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const PROJECT_STATUSES = ["active", "on-hold", "suspended", "completed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ATTENDEE_STATUSES = ["invited", "confirmed", "declined"] as const;
export type AttendeeStatus = (typeof ATTENDEE_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "activity-invite", // employee: an activity was scheduled on a project you follow
  "attendance-confirmed", // ngo: a Bata employee confirmed they are coming
  "attendance-declined", // ngo: a Bata employee withdrew
  "attendance-review", // ngo: activity finished, mark who actually showed up
  "project-assigned", // ngo: a new project was assigned to you
  "general",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** A place, optionally pinned on Google Maps. */
const LocationSchema = new Schema(
  {
    name: { type: String, trim: true }, // e.g. "Govt. Middle School, Purnea"
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    mapsUrl: { type: String, trim: true }, // pasted Google Maps link
  },
  { _id: false }
);

/* ── User (CSR team / employee / ngo) ─────────────────── */

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // Sign-in identifier for the CSR team and NGO partners. Employees imported
    // from the HR master sign in with `employeeCode` and may have no email yet,
    // so this is optional and the unique index is sparse. Never store "" or
    // null here — leave the field absent (see updateProfile / the importer).
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, index: true },
    phone: { type: String, trim: true },
    designation: { type: String, trim: true },
    employeeCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    avatarKey: { type: String }, // R2 object key for the profile picture
    org: {
      orgName: { type: String, trim: true },
      regNo: { type: String, trim: true },
      address: { type: String, trim: true },
      contactPerson: { type: String, trim: true },
    },
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    selfRegistered: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

/* ── Project ──────────────────────────────────────────── */

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: PROJECT_STATUSES, default: "active" },
    // The NGO partner that runs this project. Only they can see it.
    ngo: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    location: { type: LocationSchema, default: () => ({}) },
    // Bata employees who registered interest and get notified about activities.
    interested: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    coverKey: { type: String },
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

/** A Bata employee invited to an activity, and whether they turned up. */
const AttendeeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ATTENDEE_STATUSES, default: "invited" },
    respondedAt: { type: Date },
    present: { type: Boolean, default: null }, // set by the NGO after the activity
    markedAt: { type: Date },
  },
  { _id: false }
);

const ActivitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: ACTIVITY_CATEGORIES, default: "other" },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    // Always copied from the project — never taken from user input.
    ngo: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    location: { type: LocationSchema, default: () => ({}) },
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true }, // "HH:mm"
    durationMinutes: { type: Number, required: true, min: 15 },
    description: { type: String, trim: true },
    points: [PointSchema],
    attendees: [AttendeeSchema],
    status: { type: String, enum: ACTIVITY_STATUSES, default: "scheduled", index: true },
    completionNote: { type: String, trim: true },
    attendanceRequested: { type: Boolean, default: false },
    photoKeys: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ActivitySchema.index({ "attendees.user": 1 });

/* ── Notification ─────────────────────────────────────── */

const NotificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "general" },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    link: { type: String, trim: true },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

type WithMeta = { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };

export type UserDoc = InferSchemaType<typeof UserSchema> & WithMeta;
export type ProjectDoc = InferSchemaType<typeof ProjectSchema> & WithMeta;
export type ActivityDoc = InferSchemaType<typeof ActivitySchema> & WithMeta;
export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & WithMeta;
export type LocationValue = InferSchemaType<typeof LocationSchema>;

export const User: Model<UserDoc> = mongoose.models.User ?? mongoose.model("User", UserSchema);
export const Project: Model<ProjectDoc> =
  mongoose.models.Project ?? mongoose.model("Project", ProjectSchema);
export const Activity: Model<ActivityDoc> =
  mongoose.models.Activity ?? mongoose.model("Activity", ActivitySchema);
export const Notification: Model<NotificationDoc> =
  mongoose.models.Notification ?? mongoose.model("Notification", NotificationSchema);
