# Handoff Protocol

## Before the AI starts
The human owner must:
1. place Docs 1–8 in `docs/`
2. fill `TO_BE_ADDED_BY_HUMAN/WORKFLOW_MODE.txt`
3. fill `TO_BE_ADDED_BY_HUMAN/REPO_LINK.txt`
4. fill `TO_BE_ADDED_BY_HUMAN/CONTACTS.txt`
5. fill `TO_BE_ADDED_BY_HUMAN/CURRENT_BRANCH_POLICY.txt`

## AI operating sequence
1. Read required files in order from `planning/AI_EXECUTION_RULES.md`
2. Select the first packet marked ready and unblocked
3. Implement only that packet
4. Stop at the packet boundary
5. Ask for clarification if blocked

## Human review sequence
1. Review changes against `planning/REVIEWER_CHECKLIST.md`
2. Accept or request changes
3. Commit/push or approve continuation according to your workflow
4. Unblock next packet if appropriate
