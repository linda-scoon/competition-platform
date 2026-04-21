-- PKT-003 Core Database Schema

CREATE TYPE "PlatformRoleType" AS ENUM ('USER', 'SITE_ADMIN', 'SUPER_ADMIN');
CREATE TYPE "VerifierRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "VerifierPoolStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'PUBLISHED_UNLOCKED', 'PUBLISHED_SOFT_LOCKED', 'ACTIVE_FULLY_LOCKED', 'CLOSED', 'FINALIZED', 'CANCELED');
CREATE TYPE "ChallengeVisibilityState" AS ENUM ('PUBLIC', 'HIDDEN_BY_MODERATION', 'HIDDEN_BY_ADMIN');
CREATE TYPE "ChallengeVersionStatus" AS ENUM ('PENDING_MODERATION', 'APPROVED', 'REJECTED');
CREATE TYPE "ChallengeParticipantState" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED');
CREATE TYPE "ChallengeVerifierAssignmentStatus" AS ENUM ('ACTIVE', 'ENDED_BY_CREATOR', 'ENDED_BY_CONFLICT', 'ENDED_BY_ADMIN', 'ENDED_BY_POOL_REVOCATION');
CREATE TYPE "RunSubmissionStatus" AS ENUM ('DRAFT_UPLOAD', 'SUBMITTED', 'LOCKED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'CORRECTION_REQUESTED', 'WITHDRAWN');
CREATE TYPE "RunSubmissionLockState" AS ENUM ('UNLOCKED', 'LOCKED');
CREATE TYPE "RunSubmissionLinkType" AS ENUM ('CORRECTION_REPLACEMENT');
CREATE TYPE "VerificationDecisionType" AS ENUM ('APPROVE', 'REJECT', 'CORRECTION_REQUESTED');
CREATE TYPE "VerificationDecisionMode" AS ENUM ('NORMAL_VERIFIER', 'FALLBACK_PARTICIPANT', 'ADMIN_OVERRIDE');
CREATE TYPE "ParticipantVerificationVoteStatus" AS ENUM ('OPEN', 'PASSED', 'FAILED', 'CANCELED');
CREATE TYPE "ParticipantVerificationVoteBallotValue" AS ENUM ('YES', 'NO');
CREATE TYPE "MediaAssetType" AS ENUM ('PROFILE_AVATAR', 'CHALLENGE_COVER');
CREATE TYPE "MediaAssetStatus" AS ENUM ('UPLOADED', 'PENDING_MODERATION', 'APPROVED', 'REJECTED', 'REMOVED');
CREATE TYPE "MediaModerationDecisionType" AS ENUM ('APPROVE', 'REJECT', 'REMOVE', 'OVERRIDE_APPROVE', 'OVERRIDE_REJECT');
CREATE TYPE "NotificationType" AS ENUM ('VERIFIER_REQUEST_STATUS_CHANGED', 'VERIFIER_POOL_MEMBERSHIP_REVOKED', 'CHALLENGE_JOINED_SOFT_LOCK_TRIGGERED', 'RUN_REVIEW_CLAIMED', 'RUN_DECISION_RECORDED', 'FALLBACK_VOTE_OPENED', 'FALLBACK_VOTE_CLOSED', 'MEDIA_MODERATION_DECIDED', 'CONTACT_RELAY_DELIVERY_FAILED');
CREATE TYPE "ContactRelayDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BLOCKED');
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM');
CREATE TYPE "AuditObjectType" AS ENUM ('USER', 'ROLE_ASSIGNMENT', 'VERIFIER_ELIGIBILITY_REQUEST', 'VERIFIER_POOL_MEMBERSHIP', 'CHALLENGE', 'CHALLENGE_VERSION', 'CHALLENGE_VERIFIER_ASSIGNMENT', 'RUN_SUBMISSION', 'VERIFICATION_DECISION', 'PARTICIPANT_VERIFICATION_VOTE', 'MEDIA_ASSET', 'CONTACT_RELAY_MESSAGE');
CREATE TYPE "AuditActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'REVOKE', 'ASSIGN', 'REMOVE', 'CLAIM', 'RELEASE', 'VERIFY', 'REQUEST_CORRECTION', 'OPEN', 'CLOSE', 'OVERRIDE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "displayName" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "bio" TEXT,
  "avatarImageId" TEXT,
  "isContactable" BOOLEAN NOT NULL DEFAULT true,
  "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBlock" (
  "id" TEXT NOT NULL,
  "blockerUserId" TEXT NOT NULL,
  "blockedUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoleAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleType" "PlatformRoleType" NOT NULL,
  "grantedByUserId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerifierEligibilityRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "VerifierRequestStatus" NOT NULL,
  "reasonText" TEXT NOT NULL,
  "decisionNote" TEXT,
  "decidedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "VerifierEligibilityRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerifierPoolMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "VerifierPoolStatus" NOT NULL,
  "grantedByUserId" TEXT,
  "revokedByUserId" TEXT,
  "grantReason" TEXT,
  "revokeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "VerifierPoolMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Challenge" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "creatorUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "longDescription" TEXT NOT NULL,
  "status" "ChallengeStatus" NOT NULL,
  "joinOpensAt" TIMESTAMP(3),
  "joinClosesAt" TIMESTAMP(3),
  "submissionOpensAt" TIMESTAMP(3) NOT NULL,
  "submissionClosesAt" TIMESTAMP(3) NOT NULL,
  "resultsFinalizedAt" TIMESTAMP(3),
  "coverImageId" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "visibilityState" "ChallengeVisibilityState" NOT NULL,
  "lastApprovedVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChallengeVersion" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "longDescription" TEXT NOT NULL,
  "rulesSnapshot" JSONB NOT NULL,
  "scoringSnapshot" JSONB NOT NULL,
  "evidencePolicySnapshot" JSONB NOT NULL,
  "status" "ChallengeVersionStatus" NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "ChallengeVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChallengeParticipant" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "state" "ChallengeParticipantState" NOT NULL,
  CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChallengeVerifierAssignment" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedByUserId" TEXT NOT NULL,
  "status" "ChallengeVerifierAssignmentStatus" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "ChallengeVerifierAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RunSubmission" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "RunSubmissionStatus" NOT NULL,
  "lockState" "RunSubmissionLockState" NOT NULL,
  "videoUrl" TEXT NOT NULL,
  "videoHost" TEXT NOT NULL,
  "videoTitle" TEXT,
  "videoThumbnailUrl" TEXT,
  "evidenceUnavailableAt" TIMESTAMP(3),
  "scorePayload" JSONB NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "claimedByVerifierUserId" TEXT,
  "claimedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "RunSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RunSubmissionLink" (
  "id" TEXT NOT NULL,
  "originalSubmissionId" TEXT NOT NULL,
  "replacementSubmissionId" TEXT NOT NULL,
  "linkType" "RunSubmissionLinkType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RunSubmissionLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationDecision" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "deciderUserId" TEXT NOT NULL,
  "decisionType" "VerificationDecisionType" NOT NULL,
  "note" TEXT,
  "mode" "VerificationDecisionMode" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParticipantVerificationVote" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "status" "ParticipantVerificationVoteStatus" NOT NULL,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "openedReason" TEXT NOT NULL,
  CONSTRAINT "ParticipantVerificationVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParticipantVerificationVoteBallot" (
  "id" TEXT NOT NULL,
  "voteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "value" "ParticipantVerificationVoteBallotValue" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParticipantVerificationVoteBallot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "type" "MediaAssetType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "status" "MediaAssetStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaModerationDecision" (
  "id" TEXT NOT NULL,
  "mediaAssetId" TEXT NOT NULL,
  "deciderUserId" TEXT NOT NULL,
  "decisionType" "MediaModerationDecisionType" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaModerationDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "payload" JSONB NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactRelayMessage" (
  "id" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "deliveryStatus" "ContactRelayDeliveryStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "ContactRelayMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorType" "AuditActorType" NOT NULL,
  "objectType" "AuditObjectType" NOT NULL,
  "objectId" TEXT NOT NULL,
  "actionType" "AuditActionType" NOT NULL,
  "reason" TEXT,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE UNIQUE INDEX "UserBlock_blockerUserId_blockedUserId_key" ON "UserBlock"("blockerUserId", "blockedUserId");
CREATE INDEX "UserBlock_blockedUserId_idx" ON "UserBlock"("blockedUserId");
CREATE INDEX "RoleAssignment_userId_roleType_idx" ON "RoleAssignment"("userId", "roleType");
CREATE INDEX "RoleAssignment_grantedByUserId_idx" ON "RoleAssignment"("grantedByUserId");
CREATE INDEX "VerifierEligibilityRequest_userId_status_idx" ON "VerifierEligibilityRequest"("userId", "status");
CREATE INDEX "VerifierEligibilityRequest_decidedByUserId_idx" ON "VerifierEligibilityRequest"("decidedByUserId");
CREATE INDEX "VerifierPoolMembership_userId_status_idx" ON "VerifierPoolMembership"("userId", "status");
CREATE INDEX "VerifierPoolMembership_grantedByUserId_idx" ON "VerifierPoolMembership"("grantedByUserId");
CREATE INDEX "VerifierPoolMembership_revokedByUserId_idx" ON "VerifierPoolMembership"("revokedByUserId");
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");
CREATE UNIQUE INDEX "Challenge_lastApprovedVersionId_key" ON "Challenge"("lastApprovedVersionId");
CREATE INDEX "Challenge_creatorUserId_status_idx" ON "Challenge"("creatorUserId", "status");
CREATE UNIQUE INDEX "ChallengeVersion_challengeId_versionNumber_key" ON "ChallengeVersion"("challengeId", "versionNumber");
CREATE INDEX "ChallengeVersion_challengeId_status_idx" ON "ChallengeVersion"("challengeId", "status");
CREATE INDEX "ChallengeParticipant_challengeId_state_idx" ON "ChallengeParticipant"("challengeId", "state");
CREATE INDEX "ChallengeParticipant_userId_state_idx" ON "ChallengeParticipant"("userId", "state");
CREATE INDEX "ChallengeVerifierAssignment_challengeId_status_idx" ON "ChallengeVerifierAssignment"("challengeId", "status");
CREATE INDEX "ChallengeVerifierAssignment_userId_status_idx" ON "ChallengeVerifierAssignment"("userId", "status");
CREATE INDEX "RunSubmission_challengeId_status_submittedAt_idx" ON "RunSubmission"("challengeId", "status", "submittedAt");
CREATE INDEX "RunSubmission_userId_status_idx" ON "RunSubmission"("userId", "status");
CREATE INDEX "RunSubmission_claimedByVerifierUserId_idx" ON "RunSubmission"("claimedByVerifierUserId");
CREATE UNIQUE INDEX "RunSubmissionLink_originalSubmissionId_replacementSubmissionId_key" ON "RunSubmissionLink"("originalSubmissionId", "replacementSubmissionId");
CREATE INDEX "RunSubmissionLink_replacementSubmissionId_idx" ON "RunSubmissionLink"("replacementSubmissionId");
CREATE INDEX "VerificationDecision_submissionId_createdAt_idx" ON "VerificationDecision"("submissionId", "createdAt");
CREATE INDEX "VerificationDecision_deciderUserId_createdAt_idx" ON "VerificationDecision"("deciderUserId", "createdAt");
CREATE INDEX "ParticipantVerificationVote_challengeId_status_idx" ON "ParticipantVerificationVote"("challengeId", "status");
CREATE UNIQUE INDEX "ParticipantVerificationVoteBallot_voteId_userId_key" ON "ParticipantVerificationVoteBallot"("voteId", "userId");
CREATE INDEX "ParticipantVerificationVoteBallot_userId_createdAt_idx" ON "ParticipantVerificationVoteBallot"("userId", "createdAt");
CREATE INDEX "MediaAsset_ownerUserId_status_idx" ON "MediaAsset"("ownerUserId", "status");
CREATE INDEX "MediaModerationDecision_mediaAssetId_createdAt_idx" ON "MediaModerationDecision"("mediaAssetId", "createdAt");
CREATE INDEX "MediaModerationDecision_deciderUserId_createdAt_idx" ON "MediaModerationDecision"("deciderUserId", "createdAt");
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt" DESC);
CREATE INDEX "ContactRelayMessage_recipientUserId_deliveryStatus_createdAt_idx" ON "ContactRelayMessage"("recipientUserId", "deliveryStatus", "createdAt");
CREATE INDEX "ContactRelayMessage_senderUserId_createdAt_idx" ON "ContactRelayMessage"("senderUserId", "createdAt");
CREATE INDEX "AuditLog_objectType_objectId_idx" ON "AuditLog"("objectType", "objectId");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

CREATE UNIQUE INDEX "VerifierPoolMembership_active_per_user_unique" ON "VerifierPoolMembership"("userId")
WHERE "status" = 'ACTIVE' AND "revokedAt" IS NULL;

CREATE UNIQUE INDEX "ChallengeParticipant_active_per_user_challenge_unique" ON "ChallengeParticipant"("challengeId", "userId")
WHERE "state" = 'ACTIVE' AND "leftAt" IS NULL;

CREATE UNIQUE INDEX "ChallengeVerifierAssignment_active_per_user_challenge_unique" ON "ChallengeVerifierAssignment"("challengeId", "userId")
WHERE "status" = 'ACTIVE' AND "endedAt" IS NULL;

ALTER TABLE "VerificationDecision"
  ADD CONSTRAINT "VerificationDecision_note_required_for_negative_decisions"
  CHECK ("decisionType" = 'APPROVE' OR "note" IS NOT NULL);

ALTER TABLE "MediaModerationDecision"
  ADD CONSTRAINT "MediaModerationDecision_note_required_for_reject_remove"
  CHECK ("decisionType" IN ('APPROVE', 'OVERRIDE_APPROVE', 'OVERRIDE_REJECT') OR "note" IS NOT NULL);

ALTER TABLE "VerifierEligibilityRequest"
  ADD CONSTRAINT "VerifierEligibilityRequest_rejection_requires_decision_note"
  CHECK ("status" != 'REJECTED' OR "decisionNote" IS NOT NULL);

ALTER TABLE "User" ADD CONSTRAINT "User_avatarImageId_fkey" FOREIGN KEY ("avatarImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerifierEligibilityRequest" ADD CONSTRAINT "VerifierEligibilityRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifierEligibilityRequest" ADD CONSTRAINT "VerifierEligibilityRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerifierPoolMembership" ADD CONSTRAINT "VerifierPoolMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerifierPoolMembership" ADD CONSTRAINT "VerifierPoolMembership_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerifierPoolMembership" ADD CONSTRAINT "VerifierPoolMembership_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_lastApprovedVersionId_fkey" FOREIGN KEY ("lastApprovedVersionId") REFERENCES "ChallengeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChallengeVersion" ADD CONSTRAINT "ChallengeVersion_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeVersion" ADD CONSTRAINT "ChallengeVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeVerifierAssignment" ADD CONSTRAINT "ChallengeVerifierAssignment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeVerifierAssignment" ADD CONSTRAINT "ChallengeVerifierAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChallengeVerifierAssignment" ADD CONSTRAINT "ChallengeVerifierAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RunSubmission" ADD CONSTRAINT "RunSubmission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RunSubmission" ADD CONSTRAINT "RunSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RunSubmission" ADD CONSTRAINT "RunSubmission_claimedByVerifierUserId_fkey" FOREIGN KEY ("claimedByVerifierUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RunSubmissionLink" ADD CONSTRAINT "RunSubmissionLink_originalSubmissionId_fkey" FOREIGN KEY ("originalSubmissionId") REFERENCES "RunSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RunSubmissionLink" ADD CONSTRAINT "RunSubmissionLink_replacementSubmissionId_fkey" FOREIGN KEY ("replacementSubmissionId") REFERENCES "RunSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationDecision" ADD CONSTRAINT "VerificationDecision_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "RunSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationDecision" ADD CONSTRAINT "VerificationDecision_deciderUserId_fkey" FOREIGN KEY ("deciderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParticipantVerificationVote" ADD CONSTRAINT "ParticipantVerificationVote_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParticipantVerificationVoteBallot" ADD CONSTRAINT "ParticipantVerificationVoteBallot_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "ParticipantVerificationVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParticipantVerificationVoteBallot" ADD CONSTRAINT "ParticipantVerificationVoteBallot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaModerationDecision" ADD CONSTRAINT "MediaModerationDecision_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaModerationDecision" ADD CONSTRAINT "MediaModerationDecision_deciderUserId_fkey" FOREIGN KEY ("deciderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactRelayMessage" ADD CONSTRAINT "ContactRelayMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactRelayMessage" ADD CONSTRAINT "ContactRelayMessage_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
