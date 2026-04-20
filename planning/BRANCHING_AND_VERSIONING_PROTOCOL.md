# Branching, Commit, PR, and Tagging Protocol

## Purpose

This document tells the implementation AI exactly how to work in this repository.

This protocol is mandatory.

If any instruction in this file conflicts with another planning file, the AI must stop and ask the human owner for clarification.

---

## 1. Hard Rules

1. The AI must not guess.
2. The AI must not work directly on `main`.
3. The AI must use one branch per implementation packet.
4. The AI must create one pull request per implementation packet.
5. The AI must not mix unrelated packets in one branch or one pull request.
6. The AI must not choose version tags by itself unless the human owner explicitly asks.
7. If anything is unclear, blocked, contradictory, or missing, the AI must stop and ask.

---

## 2. Base Branch Rules

### 2.1 Protected branch
- `main` is the stable integration branch.
- The AI must never commit directly to `main`.
- All implementation work must start from the latest `main`.

### 2.2 Start rule
Before starting any packet, the AI must:
1. switch to `main`
2. pull latest `main`
3. create a new packet branch from `main`

Example:

```bash
git checkout main
git pull origin main
git checkout -b pkt-001-repo-foundation
```

---

## 3. Branch Naming Rules

### 3.1 Required format

Use this exact format:

```text
pkt-XXX-short-kebab-name
```

Where:
- `XXX` = zero-padded packet number
- `short-kebab-name` = short lowercase description

### 3.2 Examples
- `pkt-001-repo-foundation`
- `pkt-002-auth-foundation`
- `pkt-003-core-database-schema`
- `pkt-008-join-challenge-soft-lock`
- `pkt-014-verification-decisions-leaderboard`

### 3.3 Forbidden branch names
Do not use:
- `feature/test`
- `new-branch`
- `fix-stuff`
- `main-work`
- `misc-updates`

### 3.4 One packet per branch
A branch may contain work for one packet only.

If work belongs to a different packet, it must go on a different branch.

---

## 4. Packet Workflow Rules

For every packet, the AI must follow this exact order:

1. Read the packet instructions.
2. Confirm dependencies are satisfied.
3. Create the packet branch from latest `main`.
4. Implement only that packet.
5. Run required checks and tests.
6. Commit only packet-related changes.
7. Push the branch to origin.
8. Open one pull request into `main`.
9. Stop at the packet boundary unless explicitly told to start the next packet.

### 4.1 Dependency rule
If a packet is marked `sequential`, the AI must not start it until its dependency packet is accepted and merged.

If a packet is marked `parallel-safe`, the AI may start it only if doing so does not rely on guessing or unmerged ambiguous work.

If uncertain, ask.

---

## 5. Commit Message Rules

### 5.1 Commit convention
Use Conventional Commits style.

Required pattern:

```text
type(scope): short description
```

### 5.2 Allowed types
- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `chore`

### 5.3 Scope rules
The scope should name the system touched.

Examples:
- `feat(auth): add sign-in and sign-out flow`
- `feat(challenge): add draft creation`
- `fix(run): prevent unlocked edit after submit`
- `test(verifier): add conflict auto-removal coverage`
- `docs(planning): update packet notes`

### 5.4 First packet commit style
For packet implementation commits, prefer this pattern:

```text
feat(pkt-XXX): short exact description
```

Examples:
- `feat(pkt-001): initialize app foundation and tooling`
- `feat(pkt-008): add join challenge and soft lock trigger`
- `fix(pkt-014): correct leaderboard best-run calculation`

### 5.5 Commit hygiene rules
- Keep commits readable.
- Do not include unrelated cleanup.
- Do not include work for future packets.
- If multiple commits are needed, all commits must still belong to the same packet.

---

## 6. Pull Request Rules

### 6.1 One PR per packet
Every packet must have one PR.

### 6.2 Required PR title format
Use this exact format:

```text
PKT-XXX: short exact packet title
```

Examples:
- `PKT-001: Repository Foundation`
- `PKT-010: Admin Verifier Request Review`

### 6.3 Required PR body contents
Every PR must state:
1. packet ID
2. packet title
3. what was implemented
4. what was intentionally not implemented
5. docs followed
6. tests run
7. known limitations
8. any ambiguity found
9. screenshots if UI changed

### 6.4 PR scope rule
The PR must contain only packet-related changes.

### 6.5 Stop rule after PR
After opening the PR, the AI must stop unless:
- the next packet is explicitly allowed
- the next packet is dependency-safe
- no ambiguity exists

If uncertain, ask.

---

## 7. Tagging and Versioning Rules

## 7.1 Versioning model
Use Semantic Versioning for milestone tags:

```text
vMAJOR.MINOR.PATCH
```

Examples:
- `v0.1.0`
- `v0.2.0`
- `v0.2.1`
- `v1.0.0`

## 7.2 Who decides tags
The human owner decides when to create tags.

The AI must not create or choose milestone tags on its own unless explicitly instructed.

## 7.3 Suggested milestone pattern
Use milestone tags only at meaningful checkpoints, not every packet.

Suggested examples:
- `v0.1.0` after repository foundation + auth + schema
- `v0.2.0` after challenge create/publish/join
- `v0.3.0` after submissions + verification + leaderboard
- `v0.4.0` after media + profiles + contact + admin ops
- `v1.0.0` when MVP is fully ready

## 7.4 Tagging command
When the human owner instructs a milestone tag:

```bash
git checkout main
git pull origin main
git tag -a v0.1.0 -m "v0.1.0 foundation milestone"
git push origin v0.1.0
```

## 7.5 Release notes
If GitHub Releases are used later, they must be created from tags, not from arbitrary commits.

---

## 8. Merge Rules

### 8.1 Merge destination
All packet PRs merge into `main`.

### 8.2 After merge
After a packet branch is merged:
1. switch to `main`
2. pull latest `main`
3. delete local packet branch if no longer needed
4. delete remote packet branch if your workflow allows it
5. start the next packet from updated `main`

Example:

```bash
git checkout main
git pull origin main
git branch -d pkt-001-repo-foundation
```

---

## 9. Forbidden Behaviors

The AI must not:
- commit directly to `main`
- combine multiple packets in one PR
- invent a branch name format
- invent version numbers
- create milestone tags without instruction
- refactor unrelated systems in a packet branch
- silently resolve document contradictions
- continue past ambiguity without asking

---

## 10. Required Clarification Triggers

The AI must stop and ask the human owner if:
- packet dependencies are unclear
- a spec appears contradictory
- branch protection blocks a required action
- the next packet seems parallel-safe but depends on uncertain behavior
- a version tag seems needed but was not explicitly requested
- the correct scope name for commit history is unclear
- a PR would need to include unrelated files to work

---

## 11. Minimal Working Example

### Implement packet
```bash
git checkout main
git pull origin main
git checkout -b pkt-008-join-challenge-soft-lock
```

### Commit
```bash
git add .
git commit -m "feat(pkt-008): add join challenge and soft lock trigger"
```

### Push
```bash
git push -u origin pkt-008-join-challenge-soft-lock
```

### PR
Open PR:

```text
Title: PKT-008: Join Challenge + Soft Lock
Base: main
Compare: pkt-008-join-challenge-soft-lock
```

---

## 12. Final Rule

When unsure, ask.

No guessing.
