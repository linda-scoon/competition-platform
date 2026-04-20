# AI Execution Rules

These rules are mandatory.

## Rule 1 — Read order

Before writing any code, the AI must read these files in this exact order:

1. `README-FIRST.md`
2. `planning/REPOSITORY_SKELETON.md`
3. `planning/AI_EXECUTION_RULES.md`
4. `planning/IMPLEMENTATION_PACKETS.md`
5. `planning/DEFINITION_OF_DONE.md`
6. `planning/REVIEWER_CHECKLIST.md`
7. `planning/GLOSSARY.md`
8. `planning/HANDOFF_PROTOCOL.md`
9. `planning/COMMIT_PROTOCOL.md`
10. All files in `docs/` in numeric order from 01 to 08

## Rule 2 — No guessing

The AI must not guess.

If anything is:
- ambiguous
- contradictory
- missing
- under-specified
- blocked by unavailable credentials
- blocked by unavailable environment details
- blocked by unavailable design detail
- blocked by unclear acceptance criteria
- blocked by unclear branch or commit rules

the AI must stop and ask the human owner for clarification.

## Rule 3 — One packet at a time

The AI must implement only one implementation packet at a time.

The AI must not combine unrelated systems into one implementation slice.

## Rule 4 — Respect packet order

The AI must follow packet order exactly unless a packet is explicitly marked `parallel-safe` in `planning/IMPLEMENTATION_PACKETS.md`.

If a packet is marked `sequential`, the AI must not start it before the required predecessor packet is completed and pushed by the human-approved workflow.

## Rule 5 — Stop conditions

The AI must stop and ask the human owner if:
- a spec conflict is found
- a packet depends on unresolved ambiguous work
- a required secret or API key is missing
- a migration strategy is unclear
- a design token or UX state is missing for the page being implemented
- a permission rule appears inconsistent
- a security rule would need interpretation

## Rule 6 — No opportunistic refactors

The AI must not refactor unrelated files or systems in the same implementation slice.

Allowed:
- changes directly required by the current packet
- minimal supporting refactors required to make the packet work

Forbidden:
- broad cleanup
- renaming unrelated files
- restructuring unrelated folders
- styling unrelated pages
- updating unrelated tests

## Rule 7 — Definition of done is binding

The AI must use `planning/DEFINITION_OF_DONE.md` and the current packet requirements as the stopping point.

The AI must not add extra features beyond the packet scope.

## Rule 8 — Commit behavior

For every packet, the AI must:
1. implement only that packet
2. run relevant tests
3. prepare a clean commit group for that packet
4. stop at the packet boundary unless the next packet is explicitly allowed by dependency rules

## Rule 9 — Documentation behavior

The AI must not rewrite the source-of-truth documents in `docs/` unless the human owner explicitly asks.

If implementation reveals a genuine contradiction, the AI must report it instead of silently changing the docs.

## Rule 10 — Human-first clarification

When unsure, ask.

Never silently choose one interpretation when more than one reasonable interpretation exists.
