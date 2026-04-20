# Implementation Packet Prompt Template

Use this exact prompt format when instructing the AI to implement a packet.

## Prompt

Read the repository files in the required order from `planning/AI_EXECUTION_RULES.md`.

Implement **[PACKET_ID] [PACKET_TITLE]** only.

Rules:
1. Do not guess.
2. Do not implement anything outside this packet.
3. Follow Docs 1–8 and all planning files.
4. If anything is ambiguous, stop and ask.
5. One packet at a time.
6. Do not refactor unrelated code.
7. Include relevant tests.
8. Stop at the packet boundary.

Deliverables:
- code for this packet only
- tests for this packet
- a clean commit group for this packet only
- a short implementation note summarizing what changed and what did not change
