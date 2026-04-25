"use server";

import { MediaAssetType } from "@prisma/client";
import { redirect } from "next/navigation";

import { ensureChallengeCreator } from "@/lib/challenges/draft-repository";
import { getSession } from "@/lib/auth/session";
import { uploadMediaImageInDb } from "@/lib/media/repository";

export async function uploadMediaImageAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/media");
  }

  await ensureChallengeCreator(session.user);

  const typeValue = String(formData.get("type") ?? "").trim();
  const file = formData.get("imageFile");

  if (!(file instanceof File) || file.size < 1) {
    redirect("/dashboard/media?error=file_required");
  }

  if (typeValue !== MediaAssetType.PROFILE_AVATAR && typeValue !== MediaAssetType.CHALLENGE_COVER) {
    redirect("/dashboard/media?error=invalid_type");
  }

  const result = await uploadMediaImageInDb({
    ownerUserId: session.user.id,
    file,
    type: typeValue,
  });

  if (result.outcome === "INVALID_TYPE") {
    redirect("/dashboard/media?error=images_only");
  }

  if (result.outcome === "TOO_LARGE") {
    redirect("/dashboard/media?error=file_too_large");
  }

  redirect("/dashboard/media?uploaded=1");
}
