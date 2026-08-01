"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models";
import { createSession, destroySession, requireUser } from "@/lib/session";
import { emailConfigured, sendEmail } from "@/lib/email";
import { generateTempPassword } from "@/lib/utils";

export interface ActionState {
  error?: string;
  success?: string;
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Please enter your email and password." };

  await dbConnect();
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  if (!user.active) {
    return { error: "Your account has been deactivated. Please contact the director." };
  }

  await createSession({
    userId: user._id.toString(),
    role: user.role,
    name: user.name,
    email: user.email,
  });

  redirect(user.mustChangePassword ? "/dashboard/settings?force=1" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function forgotPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Please enter your email address." };

  if (!emailConfigured()) {
    return {
      error:
        "Email service is not configured. Please ask your director to reset your password.",
    };
  }

  await dbConnect();
  const user = await User.findOne({ email, active: true });
  // Do not reveal whether the account exists.
  const genericOk = {
    success: "If an account exists for that email, a temporary password has been sent.",
  };
  if (!user) return genericOk;

  const temp = generateTempPassword();
  const sent = await sendEmail({
    toEmail: user.email,
    toName: user.name,
    subject: "Bata CSR Portal — Temporary Password",
    message: `Hello ${user.name},\n\nA password reset was requested for your Bata CSR Portal account.\n\nTemporary password: ${temp}\n\nPlease log in and change it immediately from Settings.\n\n— Bata CSR Portal`,
  });
  if (!sent.ok) return { error: "Could not send the email. Please contact your director." };

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
