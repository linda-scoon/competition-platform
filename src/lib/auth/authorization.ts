import { PlatformRoleType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const ADMIN_REVIEW_ROLES: PlatformRoleType[] = [PlatformRoleType.SITE_ADMIN, PlatformRoleType.SUPER_ADMIN];

export async function userHasAdminVerifierReviewAuthority(userId: string): Promise<boolean> {
  const activeRole = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      revokedAt: null,
      roleType: {
        in: ADMIN_REVIEW_ROLES,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(activeRole);
}
