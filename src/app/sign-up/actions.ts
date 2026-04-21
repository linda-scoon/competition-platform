"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSession } from "@/lib/auth/session";
import { createUser } from "@/lib/auth/store";
import { hashPassword } from "@/lib/auth/password";

const signUpSchema = z
  .object({
    name: z.string().min(1).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect("/sign-up?error=invalid_input");
  }

  try {
    const user = createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: hashPassword(parsed.data.password),
    });

    await createSession(user);
    redirect("/dashboard");
  } catch {
    redirect("/sign-up?error=email_exists");
  }
}
