import { ChallengeStatus } from "@prisma/client";

const STATUS_LABELS: Record<ChallengeStatus, string> = {
  [ChallengeStatus.DRAFT]: "Draft",
  [ChallengeStatus.PUBLISHED_UNLOCKED]: "Published",
  [ChallengeStatus.PUBLISHED_SOFT_LOCKED]: "Soft locked",
  [ChallengeStatus.ACTIVE_FULLY_LOCKED]: "Active",
  [ChallengeStatus.CLOSED]: "Closed",
  [ChallengeStatus.FINALIZED]: "Finalized",
  [ChallengeStatus.CANCELED]: "Canceled",
};

const STATUS_CLASS_NAMES: Record<ChallengeStatus, string> = {
  [ChallengeStatus.DRAFT]: "border-slate-600/60 bg-slate-800/60 text-slate-200",
  [ChallengeStatus.PUBLISHED_UNLOCKED]: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  [ChallengeStatus.PUBLISHED_SOFT_LOCKED]: "border-indigo-500/40 bg-indigo-500/10 text-indigo-200",
  [ChallengeStatus.ACTIVE_FULLY_LOCKED]: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  [ChallengeStatus.CLOSED]: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  [ChallengeStatus.FINALIZED]: "border-violet-500/40 bg-violet-500/10 text-violet-200",
  [ChallengeStatus.CANCELED]: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

type PublicChallengeStateBadgeProps = {
  status: ChallengeStatus;
};

export function PublicChallengeStateBadge({ status }: PublicChallengeStateBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${STATUS_CLASS_NAMES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export const PUBLIC_CHALLENGE_STATE_LABELS = STATUS_LABELS;
