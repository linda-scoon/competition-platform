import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  ChallengeStatus: {
    PUBLISHED_UNLOCKED: "PUBLISHED_UNLOCKED",
    PUBLISHED_SOFT_LOCKED: "PUBLISHED_SOFT_LOCKED",
    ACTIVE_FULLY_LOCKED: "ACTIVE_FULLY_LOCKED",
    CLOSED: "CLOSED",
    FINALIZED: "FINALIZED",
  },
  ChallengeVisibilityState: {
    PUBLIC: "PUBLIC",
  },
  ContactRelayDeliveryStatus: {
    QUEUED: "QUEUED",
  },
  ChallengeParticipantState: {
    ACTIVE: "ACTIVE",
  },
  MediaAssetStatus: {
    APPROVED: "APPROVED",
  },
}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userBlock: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    contactRelayMessage: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

import {
  getPublicProfileByUsernameFromDb,
  sendContactRelayMessageInDb,
} from "@/lib/profiles/repository";

describe("profile contact relay and block logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides missing-version challenges from public profile lists", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_1",
      username: "creator",
      displayName: "Creator",
      bio: null,
      isContactable: true,
      avatarImage: null,
      challengesCreated: [
        {
          id: "c_1",
          slug: "public-challenge",
          status: "PUBLISHED_UNLOCKED",
          lastApprovedVersion: { title: "Public Challenge" },
        },
        {
          id: "c_2",
          slug: "missing-version",
          status: "PUBLISHED_UNLOCKED",
          lastApprovedVersion: null,
        },
      ],
      challengeParticipants: [
        {
          challenge: {
            id: "c_3",
            slug: "joined-public",
            status: "ACTIVE_FULLY_LOCKED",
            lastApprovedVersion: { title: "Joined Public" },
          },
        },
      ],
    });

    prismaMock.userBlock.findFirst.mockResolvedValue(null);

    const profile = await getPublicProfileByUsernameFromDb({
      username: "creator",
      viewerUserId: "viewer_1",
    });

    expect(profile?.createdChallenges).toEqual([
      {
        id: "c_1",
        slug: "public-challenge",
        status: "PUBLISHED_UNLOCKED",
        title: "Public Challenge",
      },
    ]);

    expect(profile?.joinedChallenges).toEqual([
      {
        id: "c_3",
        slug: "joined-public",
        status: "ACTIVE_FULLY_LOCKED",
        title: "Joined Public",
      },
    ]);
  });

  it("blocks contact relay when a block exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "recipient_1",
      isContactable: true,
    });
    prismaMock.userBlock.findFirst.mockResolvedValue({ id: "block_1" });

    const result = await sendContactRelayMessageInDb({
      senderUserId: "sender_1",
      recipientUsername: "recipient",
      subject: "Hello",
      body: "Body",
    });

    expect(result).toEqual({ outcome: "BLOCKED" });
    expect(prismaMock.contactRelayMessage.create).not.toHaveBeenCalled();
  });

  it("queues contact relay when allowed", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "recipient_1",
      isContactable: true,
    });
    prismaMock.userBlock.findFirst.mockResolvedValue(null);
    prismaMock.contactRelayMessage.create.mockResolvedValue({ id: "msg_1" });

    const result = await sendContactRelayMessageInDb({
      senderUserId: "sender_1",
      recipientUsername: "recipient",
      subject: null,
      body: "Body",
    });

    expect(result).toEqual({ outcome: "SENT" });
    expect(prismaMock.contactRelayMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderUserId: "sender_1",
          recipientUserId: "recipient_1",
          deliveryStatus: "QUEUED",
        }),
      }),
    );
  });
});
