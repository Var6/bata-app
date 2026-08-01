"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { dbConnect } from "@/lib/db";
import { Activity, User, type Role } from "@/lib/models";
import { requireUser } from "@/lib/session";
import { emailConfigured, sendEmail } from "@/lib/email";
import { generateTempPassword } from "@/lib/utils";
import type { ActionState } from "@/lib/actions/auth";

export interface UserActionState extends ActionState {
  /** Shown once to the director so they can share credentials directly. */
  tempPassword?: string;
}

function pathFor(role: Role) {
  return role === "ngo" ? "/dashboard/ngos" : "/dashboard/employees";
}

/** Director creates an employee or NGO account. */
export async function createUser(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const me = await requireUser(["director"]);

  const role = String(formData.get("role")) as Role;
  if (role !== "employee" && role !== "ngo") return { error: "Invalid role." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!name || !email) return { error: "Name and email are required." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email address." };

  await dbConnect();
  if (await User.exists({ email })) return { error: "An account with this email already exists." };

  const temp = generateTempPassword();
  await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(temp, 10),
    role,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    designation:
      role === "employee" ? String(formData.get("designation") ?? "").trim() || undefined : undefined,
    org:
      role === "ngo"
        ? {
            orgName: String(formData.get("orgName") ?? "").trim(),
            regNo: String(formData.get("regNo") ?? "").trim() || undefined,
            address: String(formData.get("address") ?? "").trim() || undefined,
            contactPerson: String(formData.get("contactPerson") ?? "").trim() || undefined,
          }
        : undefined,
    mustChangePassword: true,
    createdBy: me._id,
  });

  let emailed = false;
  if (emailConfigured()) {
    const sent = await sendEmail({
      toEmail: email,
      toName: name,
      subject: "Welcome to the Bata CSR Portal",
      message: `Hello ${name},\n\nAn account has been created for you on the Bata CSR Portal.\n\nEmail: ${email}\nTemporary password: ${temp}\n\nPlease log in and change your password from Settings.\n\n— Bata CSR Portal`,
    });
    emailed = sent.ok;
  }

  revalidatePath(pathFor(role));
  return {
    success: `${role === "ngo" ? "NGO" : "Employee"} account created${emailed ? " and credentials emailed" : ""}.`,
    tempPassword: temp,
  };
}

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["director"]);
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  await dbConnect();
  const user = await User.findById(id);
  if (!user || user.role === "director") return { error: "Account not found." };

  user.name = name;
  user.phone = String(formData.get("phone") ?? "").trim() || undefined;
  if (user.role === "employee") {
    user.designation = String(formData.get("designation") ?? "").trim() || undefined;
  }
  if (user.role === "ngo") {
    user.org = {
      orgName: String(formData.get("orgName") ?? "").trim(),
      regNo: String(formData.get("regNo") ?? "").trim() || undefined,
      address: String(formData.get("address") ?? "").trim() || undefined,
      contactPerson: String(formData.get("contactPerson") ?? "").trim() || undefined,
    };
  }
  await user.save();

  revalidatePath(pathFor(user.role));
  return { success: "Account updated." };
}

export async function toggleUserActive(formData: FormData) {
  await requireUser(["director"]);
  await dbConnect();
  const user = await User.findById(String(formData.get("id")));
  if (!user || user.role === "director") return;
  user.active = !user.active;
  await user.save();
  revalidatePath(pathFor(user.role));
}

export async function deleteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(["director"]);
  await dbConnect();
  const user = await User.findById(String(formData.get("id")));
  if (!user || user.role === "director") return { error: "Account not found." };

  const inUse = await Activity.exists({
    $or: [{ ngo: user._id }, { participants: user._id }],
  });
  if (inUse) {
    return {
      error:
        "This account is linked to activities and cannot be deleted. Deactivate it instead to block access.",
    };
  }

  await user.deleteOne();
  revalidatePath(pathFor(user.role));
  return { success: "Account deleted." };
}

/** Director resets a password: generates a temp password, forces a change on next login. */
export async function resetPassword(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  await requireUser(["director"]);
  await dbConnect();
  const user = await User.findById(String(formData.get("id")));
  if (!user || user.role === "director") return { error: "Account not found." };

  const temp = generateTempPassword();
  user.passwordHash = await bcrypt.hash(temp, 10);
  user.mustChangePassword = true;
  await user.save();

  let emailed = false;
  if (emailConfigured()) {
    const sent = await sendEmail({
      toEmail: user.email,
      toName: user.name,
      subject: "Bata CSR Portal — Password Reset",
      message: `Hello ${user.name},\n\nYour password was reset by the director.\n\nTemporary password: ${temp}\n\nPlease log in and change it from Settings.\n\n— Bata CSR Portal`,
    });
    emailed = sent.ok;
  }

  revalidatePath(pathFor(user.role));
  return {
    success: `Password reset for ${user.name}${emailed ? " and emailed to them" : ""}.`,
    tempPassword: temp,
  };
}
