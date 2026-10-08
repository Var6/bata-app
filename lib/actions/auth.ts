"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { dbConnect } from "@/lib/db";
import { User, EMPLOYEE_CODE_PATTERN, EMPLOYEE_CODE_HINT } from "@/lib/models";
import { createSession, destroySession, requireUser } from "@/lib/session";
import { emailConfigured, sendEmail } from "@/lib/email";
import { generateTempPassword } from "@/lib/utils";
import { uploadImage } from "@/lib/upload";

export interface ActionState {
  error?: string;
  success?: string;
}

/**
 * Sign in with either an email address (CSR team, NGO partners, employees who
 * added one) or a Bata employee code (every employee from the HR master).
 */
export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) {
    return { error: "Please enter your email or employee code, and your password." };
  }

  await dbConnect();
  const user = identifier.includes("@")
    ? await User.findOne({ email: identifier.toLowerCase() })
    : await User.findOne({ employeeCode: identifier.toUpperCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid email / employee code or password." };
  }
  if (!user.active) {
    return { error: "Your account has been deactivated. Please contact the Bata CSR team." };
  }

  await createSession({
    userId: user._id.toString(),
    role: user.role,
    name: user.name,
    email: user.email ?? undefined,
  });

  redirect(user.mustChangePassword ? "/dashboard/settings?force=1" : "/dashboard");
}

/**
 * Self-registration for Bata employees. The employee code must look valid and
 * must not already be registered by someone else.
 */
export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const employeeCode = String(formData.get("employeeCode") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!name || !email || !employeeCode) {
    return { error: "Name, work email and employee code are all required." };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email address." };
  if (!EMPLOYEE_CODE_PATTERN.test(employeeCode)) {
    return { error: `That employee code doesn't look right — expected ${EMPLOYEE_CODE_HINT}.` };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  await dbConnect();
  if (await User.exists({ employeeCode })) {
    return {
      error:
        "That employee code already has an account. Sign in with your employee code and the password the CSR team gave you, or ask them to reset it.",
    };
  }
  if (await User.exists({ email })) {
    return { error: "An account with this email already exists. Try signing in instead." };
  }

  const user = await User.create({
    name,
    email,
    employeeCode,
    passwordHash: await bcrypt.hash(password, 10),
    role: "employee",
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    designation: String(formData.get("designation") ?? "").trim() || undefined,
    active: true,
    selfRegistered: true,
    mustChangePassword: false,
  });

  await createSession({
    userId: user._id.toString(),
    role: user.role,
    name: user.name,
    email: user.email ?? undefined,
  });
  redirect("/dashboard/projects?welcome=1");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function forgotPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Please enter your email address." };
  if (!email.includes("@")) {
    return {
      error:
        "Password resets by email need the email address on your profile. If you only have an employee code, ask the Bata CSR team to reset your password.",
    };
  }

  if (!emailConfigured()) {
    return { error: "Email service is not configured. Please ask the Bata CSR team to reset your password." };
  }

  await dbConnect();
  const user = await User.findOne({ email, active: true });
  const genericOk = {
    success: "If an account exists for that email, a temporary password has been sent.",
  };
  if (!user?.email) return genericOk;

  const temp = generateTempPassword();
  const sent = await sendEmail({
    toEmail: user.email,
    toName: user.name,
    subject: "Bata CSR Portal — Temporary Password",
    message: `Hello ${user.name},\n\nA password reset was requested for your Bata CSR Portal account.\n\nTemporary password: ${temp}\n\nPlease log in and change it immediately from Settings.\n\n— Bata CSR Portal`,
  });
  if (!sent.ok) return { error: "Could not send the email. Please contact the Bata CSR team." };

  user.passwordHash = await bcrypt.hash(temp, 10);
  user.mustChangePassword = true;
  await user.save();
  return genericOk;
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };

  await dbConnect();
  const user = await User.findById(me._id);
  if (!user) return { error: "Account not found." };
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }

  user.passwordHash = await bcrypt.hash(next, 10);
  user.mustChangePassword = false;
  await user.save();
  return { success: "Password updated successfully." };
}

/**
 * Update your own name, email, phone, designation and profile picture.
 * Employees sign in with their employee code, so for them the email is
 * optional; the CSR team and NGO partners sign in with it, so they must keep one.
 */
export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!name) return { error: "Name is required." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email address." };
  if (!email && me.role !== "employee") return { error: "Email is required — it is how you sign in." };

  await dbConnect();
  const user = await User.findById(me._id);
  if (!user) return { error: "Account not found." };

  if (email && email !== user.email && (await User.exists({ email, _id: { $ne: user._id } }))) {
    return { error: "That email address is already used by another account." };
  }

  try {
    const avatarKey = await uploadImage(formData.get("avatar"), "avatars");
    if (avatarKey) user.avatarKey = avatarKey;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }

  const emailChanged = (email || undefined) !== (user.email || undefined);
  user.name = name;
  // Never store "" — the unique index is sparse, so the field must be absent.
  user.email = email || undefined;
  user.phone = String(formData.get("phone") ?? "").trim() || undefined;
  if (user.role === "employee") {
    user.designation = String(formData.get("designation") ?? "").trim() || undefined;
  }
  if (user.role === "ngo") {
    user.org = {
      ...user.org,
      orgName: String(formData.get("orgName") ?? "").trim() || user.org?.orgName,
      contactPerson: String(formData.get("contactPerson") ?? "").trim() || undefined,
      address: String(formData.get("orgAddress") ?? "").trim() || undefined,
    };
  }
  await user.save();

  // The session carries name/email, so refresh it after a change.
  await createSession({
    userId: user._id.toString(),
    role: user.role,
    name: user.name,
    email: user.email ?? undefined,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return {
    success:
      emailChanged && user.email
        ? "Profile updated. You can now also sign in with your email address."
        : "Profile updated.",
  };
}
