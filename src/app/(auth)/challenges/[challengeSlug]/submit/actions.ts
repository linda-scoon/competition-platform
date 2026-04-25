"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { runSubmissionInputSchema } from "@/lib/runs/submission-schema";
import { submitLockedRunInDb } from "@/lib/runs/submission-repository";

export async function submitRunAction(args: { challengeSlug: string }, formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(`/challenges/${args.challengeSlug}/submit`)}`);
  }

  const parsedScore = Number(String(formData.get("primaryScore") ?? "").trim());

  const parsed = runSubmissionInputSchema.safeParse({
    videoUrl: String(formData.get("videoUrl") ?? ""),
    primaryScore: parsedScore,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    redirect(`/challenges/${args.challengeSlug}/submit?error=invalid_form`);
  }

  const result = await submitLockedRunInDb({
    challengeSlug: args.challengeSlug,
    userId: session.user.id,
    videoUrl: parsed.data.videoUrl,
    primaryScore: parsed.data.primaryScore,
    notes: parsed.data.notes,
  });

  if (result.outcome === "SUBMITTED") {
    redirect(`/challenges/${result.challengeSlug}/submit?submitted=1`);
  }

  if (result.outcome === "CHALLENGE_NOT_FOUND_OR_INELIGIBLE") {
    redirect(`/challenges/${args.challengeSlug}/submit?error=ineligible_challenge`);
  }

  if (result.outcome === "PARTICIPANT_NOT_ELIGIBLE") {
    redirect(`/challenges/${args.challengeSlug}/submit?error=participant_not_eligible`);
  }

  if (result.outcome === "SUBMISSION_WINDOW_NOT_OPEN") {
    redirect(`/challenges/${args.challengeSlug}/submit?error=window_not_open`);
  }

  if (result.outcome === "SUBMISSION_WINDOW_CLOSED") {
    redirect(`/challenges/${args.challengeSlug}/submit?error=window_closed`);
  }

  if (result.outcome === "UNSUPPORTED_VIDEO_HOST") {
    redirect(`/challenges/${args.challengeSlug}/submit?error=unsupported_host`);
  }

  if (result.outcome === "UNSUPPORTED_VIDEO_FORMAT") {
    redirect(`/challenges/${args.challengeSlug}/submit?error=unsupported_format`);
  }

  redirect(`/challenges/${args.challengeSlug}/submit?error=invalid_video_url`);
}
