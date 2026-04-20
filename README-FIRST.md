# Repository Setup Checklist

This repository is the implementation workspace for the Exercise Competition Platform MVP.

## Mandatory setup before the AI starts implementation

1. Keep the folder structure exactly as defined in `planning/REPOSITORY_SKELETON.md`.
2. Place the approved source documents into `docs/`.
3. Keep file names exactly as listed in `planning/REPOSITORY_SKELETON.md`.
4. Add the AI operating rules from `planning/AI_EXECUTION_RULES.md`.
5. Add the commit template guidance from `planning/COMMIT_PROTOCOL.md`.
6. Add the issue template from `.github/ISSUE_TEMPLATE/implementation-packet.md`.
7. Add the handoff and reviewer documents from `planning/`.
8. Fill the files in `TO_BE_ADDED_BY_HUMAN/`.

## Hard rule

The AI must not guess.

If anything is missing, contradictory, unclear, or under-specified, the AI must stop and ask for clarification before implementing.

## Working model for this repository

This repository is currently using:
- no Epic
- no mandatory PR workflow
- direct push to the main branch by the owner

Because of that, the AI must follow this substitute rule:

**One packet = one isolated implementation slice = one clean commit group.**

The AI may continue to the next packet only if the next packet is unblocked by dependency rules.

## Human action required

Replace any placeholder value marked `TO_BE_FILLED_BY_HUMAN` before handing the repository to the AI.
