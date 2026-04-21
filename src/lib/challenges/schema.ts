import { z } from "zod";

export const challengeDraftInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  shortDescription: z.string().trim().min(10).max(280),
  longDescription: z.string().trim().min(30).max(5000),
});

export type ChallengeDraftInput = z.infer<typeof challengeDraftInputSchema>;
