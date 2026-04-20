# Document 08 — Implementation Plan

## Document Stack
1. Product Foundations Document  
2. Product Requirements Document  
3. Information Architecture and Sitemap  
4. UX Specification  
5. Technical Specification  
6. Design System Specification  
7. Security and Governance Specification  
8. **Implementation Plan — current**

---

## 1. Document Purpose

This document defines the implementation order, packet execution rules, handoff rules, review boundaries, and stop conditions for the MVP.

This document is written for an implementation AI.

This document is authoritative for:
- build order
- implementation packet sequencing
- dependency rules
- branch/PR behavior reference
- stop conditions
- review boundaries
- packet acceptance logic
- milestone guidance

This document is not authoritative for:
- product behavior beyond Docs 1–7
- visual design beyond Docs 4 and 6
- security policy beyond Doc 7
- ad hoc feature additions

If this document appears to conflict with Docs 1–7, the AI must stop and ask the human owner for clarification.

---

## 2. Read Order Before Any Implementation

Before changing any code, the AI must read these files in this exact order:

1. `README-FIRST.md`
2. `planning/REPOSITORY_SKELETON.md`
3. `planning/AI_EXECUTION_RULES.md`
4. `planning/BRANCHING_AND_VERSIONING_PROTOCOL.md`
5. `planning/IMPLEMENTATION_PACKETS.md`
6. `planning/DEFINITION_OF_DONE.md`
7. `planning/REVIEWER_CHECKLIST.md`
8. `planning/GLOSSARY.md`
9. `planning/HANDOFF_PROTOCOL.md`
10. `planning/COMMIT_PROTOCOL.md`
11. all files in `docs/` in numeric order from `01` to `08`

The AI must not begin implementation until this read order is completed.

---

## 3. Global Implementation Rules

### 3.1 No guessing
The AI must not guess.

If anything is:
- ambiguous
- contradictory
- missing
- under-specified
- blocked by missing credentials
- blocked by unclear environment setup
- blocked by unclear UX state
- blocked by unclear security rule
- blocked by unclear packet dependency

the AI must stop and ask the human owner for clarification.

### 3.2 One packet at a time
The AI must implement only one packet at a time.

The AI must not combine unrelated packets into one branch or one pull request.

### 3.3 One packet = one branch = one PR
Every packet must be implemented on its own packet branch and opened as its own PR into `main`.

### 3.4 Respect packet order
If a packet is marked `sequential`, it must not start until all listed dependencies are merged into `main`.

If a packet is marked `parallel-safe`, it may start only if doing so does not require guessing and does not depend on unmerged ambiguous behavior.

### 3.5 No opportunistic refactors
The AI must not refactor unrelated systems during packet implementation.

Allowed:
- directly required code for the packet
- small supporting refactors required to make the packet work

Forbidden:
- broad cleanup
- renaming unrelated files
- moving unrelated folders
- redesigning unrelated UI
- rewriting unrelated tests

### 3.6 Stop at the packet boundary
After opening the PR for a packet, the AI must stop unless the human owner explicitly tells it to begin the next packet or the operating workflow explicitly allows safe continuation.

---

## 4. Branching, Commit, and PR Rules

The AI must follow `planning/BRANCHING_AND_VERSIONING_PROTOCOL.md`.

### 4.1 Branch naming rule
Use:
```text
pkt-XXX-short-kebab-name
```

Examples:
- `pkt-001-repo-foundation`
- `pkt-008-join-challenge-soft-lock`
- `pkt-014-verification-decisions-leaderboard`

### 4.2 Commit message rule
Use Conventional Commit style.

Preferred packet format:
```text
feat(pkt-XXX): short exact description
```

Examples:
- `feat(pkt-001): initialize app foundation and tooling`
- `feat(pkt-012): add locked run submission flow`
- `fix(pkt-014): correct leaderboard best-run calculation`

### 4.3 PR title rule
Use:
```text
PKT-XXX: exact packet title
```

Example:
```text
PKT-008: Join Challenge + Soft Lock
```

### 4.4 PR body rule
Every PR must state:
- packet ID
- packet title
- what was implemented
- what was not implemented
- docs followed
- tests run
- known limitations
- ambiguities found
- screenshots if UI changed

### 4.5 No direct commits to main
The AI must never commit directly to `main`.

---

## 5. Definition of Done Rule

A packet is done only when all of the following are true:
1. packet scope only
2. relevant docs followed
3. tests for that packet pass
4. lint and typecheck pass
5. no unrelated changes included
6. UI states match docs if UI is part of packet
7. permissions/security rules are enforced server-side where relevant
8. implementation notes are clear
9. acceptance criteria are satisfied
10. no unresolved ambiguity remains

If any item above is false, the packet is not done.

---

## 6. Human Review Rules

The human owner reviews each packet using `planning/REVIEWER_CHECKLIST.md`.

The AI must assume:
- every packet will be reviewed
- review can reject the packet
- review can request changes
- review can block the next packet if specs need clarification

The AI must not assume approval.

---

## 7. Implementation Strategy

The MVP must be built in layers.

### 7.1 Layering principle
Build in this order:
1. repository and tooling foundation
2. auth and session foundation
3. schema and core data model
4. public shell and navigation
5. challenge creation and publication
6. challenge participation
7. verifier governance
8. run submission and verification
9. leaderboard and state transitions
10. fallback vote and fallback verification
11. media library and moderation
12. profiles, contact relay, blocking
13. admin tools
14. PWA setup
15. final hardening

### 7.2 Why this order exists
This order reduces AI failure risk:
- lower-level dependencies are built before dependent features
- packet sizes stay reviewable
- permissions and state rules can be checked in isolation
- UI and backend can evolve in lockstep rather than as one giant speculative build

---

## 8. Packet Plan

## PKT-001 Repository Foundation
**Dependency type:** sequential  
**Depends on:** none

### Goal
Create application scaffold, tooling, base folders, linting, formatting, env handling, and CI baseline.

### In scope
- initialize Next.js + TypeScript
- configure Tailwind
- configure Prisma
- configure linting, formatting, typecheck scripts
- configure base folder structure
- configure environment example file
- configure CI for lint/typecheck/tests

### Out of scope
- product pages
- auth business logic
- feature models

### Acceptance criteria
- app boots
- CI baseline passes
- repo structure supports later packets

---

## PKT-002 Auth Foundation
**Dependency type:** sequential  
**Depends on:** PKT-001

### Goal
Implement sign-up, sign-in, sign-out, session handling, and return-to-origin flow.

### In scope
- auth provider setup
- auth pages baseline
- protected route handling
- return-to-origin redirect logic

### Out of scope
- admin roles
- verifier pool

### Acceptance criteria
- user can sign in/out
- protected routes redirect correctly
- return-to-origin works

---

## PKT-003 Core Database Schema
**Dependency type:** sequential  
**Depends on:** PKT-001

### Goal
Create initial schema for users, challenges, participants, runs, verifier requests, verifier pool, notifications, audit log, media assets, and blocks.

### In scope
- Prisma models
- migrations
- indexes
- schema constraints required by docs

### Out of scope
- UI

### Acceptance criteria
- migrations run cleanly
- schema matches Docs 2, 5, and 7

---

## PKT-004 Public Shell and Navigation
**Dependency type:** parallel-safe  
**Depends on:** PKT-001

### Goal
Implement public shell, auth shell placeholder, admin shell placeholder, top nav, and footer.

### In scope
- layout shells
- navigation structure
- route placeholders

### Out of scope
- data-driven product flows

### Acceptance criteria
- shells exist and match Docs 3, 4, and 6

---

## PKT-005 Challenge Create/Edit Foundation
**Dependency type:** sequential  
**Depends on:** PKT-002, PKT-003, PKT-004

### Goal
Implement challenge draft creation and edit flows before publish.

### In scope
- create challenge page
- edit challenge page for draft
- persistence of draft data

### Out of scope
- publish moderation
- join flow

### Acceptance criteria
- signed-in user can create and edit draft

---

## PKT-006 Challenge Publish + AI Moderation
**Dependency type:** sequential  
**Depends on:** PKT-005

### Goal
Implement publish flow and immediate AI moderation for public challenge content.

### In scope
- challenge versioning
- AI moderation request/decision handling
- publish success/reject behavior

### Out of scope
- join flow

### Acceptance criteria
- approved content becomes public
- rejected content stays non-public
- last approved version remains live on rejected edits

---

## PKT-007 Challenge Discovery + Public Detail
**Dependency type:** sequential  
**Depends on:** PKT-006, PKT-004

### Goal
Implement challenge directory and challenge detail public rendering.

### In scope
- challenge list
- challenge detail tab baseline
- public states
- header/meta rendering

### Out of scope
- join action
- submit action

### Acceptance criteria
- public users can browse and open challenges

---

## PKT-008 Join Challenge + Soft Lock
**Dependency type:** sequential  
**Depends on:** PKT-007

### Goal
Implement join challenge behavior and first-participant soft lock.

### In scope
- join action
- participant membership
- soft lock trigger
- audit entry

### Out of scope
- run submission

### Acceptance criteria
- first join triggers soft lock permanently

---

## PKT-009 Verifier Eligibility Requests
**Dependency type:** sequential  
**Depends on:** PKT-002, PKT-003, PKT-004

### Goal
Implement verifier eligibility request page and data flow.

### In scope
- request page
- request creation
- status display

### Out of scope
- admin approval UI

### Acceptance criteria
- user can submit request and see status

---

## PKT-010 Admin Verifier Request Review
**Dependency type:** sequential  
**Depends on:** PKT-009

### Goal
Implement admin review for verifier eligibility requests.

### In scope
- admin verifier request page
- approve/reject actions
- pool membership creation/revocation
- audit entries

### Out of scope
- challenge-level assignment

### Acceptance criteria
- admin can approve/reject and audit logs are written

---

## PKT-011 Challenge Verifier Assignment
**Dependency type:** sequential  
**Depends on:** PKT-010, PKT-007

### Goal
Implement creator assignment of verifiers from approved pool.

### In scope
- manage verifiers page
- assignment/removal rules
- conflict checks at assignment time

### Out of scope
- auto-removal on later conflict

### Acceptance criteria
- creator can assign only eligible non-conflicted users
- creator self-assignment remains blocked

---

## PKT-012 Run Submission
**Dependency type:** sequential  
**Depends on:** PKT-008, PKT-007, PKT-003

### Goal
Implement run submission with external video link and immediate submission lock.

### In scope
- submit page
- host validation
- immutable locked submission creation
- evidence warning text behavior support

### Out of scope
- verification decision UI

### Acceptance criteria
- participant can submit locked run
- unsupported hosts are rejected

---

## PKT-013 Review Queue + Claiming
**Dependency type:** sequential  
**Depends on:** PKT-011, PKT-012

### Goal
Implement verifier queue visibility and claim mechanism.

### In scope
- unclaimed queue
- claim flow
- claim release basics
- permission checks

### Out of scope
- final verification decision actions

### Acceptance criteria
- assigned verifier can claim eligible submission
- other verifiers cannot double-decide claimed runs

---

## PKT-014 Verification Decisions + Leaderboard
**Dependency type:** sequential  
**Depends on:** PKT-013

### Goal
Implement approve/reject/correction decisions and leaderboard recalculation.

### In scope
- decision actions
- note requirements
- leaderboard best-run logic
- decision notifications

### Out of scope
- fallback vote mode

### Acceptance criteria
- verified runs update leaderboard correctly
- reject/correction require notes
- approvals do not require notes

---

## PKT-015 Conflict Auto-Removal
**Dependency type:** sequential  
**Depends on:** PKT-011, PKT-012

### Goal
Auto-remove verifier assignment if verifier later joins or submits to same challenge.

### In scope
- conflict detection
- auto-removal
- audit logging
- UI state update support

### Out of scope
- fallback vote

### Acceptance criteria
- conflicted verifier loses assignment immediately

---

## PKT-016 Full Lock + Closed + Finalized
**Dependency type:** sequential  
**Depends on:** PKT-012, PKT-014

### Goal
Implement full lock, close, and finalize transitions.

### In scope
- full lock trigger
- closed state
- finalized state
- related audit logging

### Acceptance criteria
- challenge transitions correctly by schedule and resolution state

---

## PKT-017 Fallback Vote and Fallback Verification
**Dependency type:** sequential  
**Depends on:** PKT-014, PKT-015, PKT-016

### Goal
Implement no-verifier close alert, participant vote, and restricted fallback verification.

### In scope
- trigger rules
- vote page/state
- vote threshold
- fallback decision mode
- Site Admin alerting

### Acceptance criteria
- unresolved no-verifier closed challenge opens vote and follows rules
- self-verification remains impossible

---

## PKT-018 Media Library Upload + Admin Moderation
**Dependency type:** sequential  
**Depends on:** PKT-002, PKT-003

### Goal
Implement image upload, pending state, and admin moderation.

### In scope
- media asset upload
- pending/approved/rejected/removed states
- admin media review
- public placeholder fallback

### Acceptance criteria
- only approved images render publicly

---

## PKT-019 Public Profiles + Contact Relay + Blocking
**Dependency type:** sequential  
**Depends on:** PKT-002, PKT-003, PKT-007, PKT-018

### Goal
Implement profiles, contact relay, contactability settings, and block logic.

### In scope
- public profile pages
- contact relay
- contact preferences
- blocking logic

### Acceptance criteria
- contact relay respects privacy and blocks
- blocked users do not see contact CTA

---

## PKT-020 Notifications Center
**Dependency type:** parallel-safe  
**Depends on:** PKT-003, PKT-004

### Goal
Implement notifications storage and UI.

### In scope
- notification list UI
- mark read/unread
- event rendering

### Acceptance criteria
- notifications render correctly and can be marked read

---

## PKT-021 Admin Operations Pages
**Dependency type:** sequential  
**Depends on:** PKT-010, PKT-014, PKT-017, PKT-018, PKT-019, PKT-020

### Goal
Implement admin dashboards for logs, runs, challenges, users, AI moderation, and unresolved filters.

### In scope
- admin home
- logs page
- runs page
- users page
- challenges page
- AI moderation page
- unresolved filters

### Acceptance criteria
- admin can manage operational queues without guessing
- unresolved closed challenge cases are visible

---

## PKT-022 PWA Setup
**Dependency type:** parallel-safe  
**Depends on:** PKT-004

### Goal
Add manifest, icons, installable shell, and safe caching.

### In scope
- manifest
- icons
- safe service-worker setup
- installability

### Acceptance criteria
- app is installable
- private pages are not cached unsafely

---

## PKT-023 Final Hardening Pass
**Dependency type:** sequential  
**Depends on:** all previous packets

### Goal
Run focused hardening on permissions, audit coverage, accessibility gaps, and edge-case tests.

### In scope
- permission review
- audit coverage review
- accessibility review
- edge-case tests
- cleanup limited to MVP correctness

### Acceptance criteria
- no unresolved critical MVP gaps remain

---

## 9. Parallel-Safe Guidance

A packet marked `parallel-safe` is not automatically safe in every situation.

The AI may start a `parallel-safe` packet only if:
- required docs are already complete
- required lower-level scaffolding exists
- no unresolved ambiguity affects the packet
- no missing dependency would force guessing

If uncertain, ask.

---

## 10. Milestone Guidance

The human owner decides milestone tags.

Suggested milestones:
- `v0.1.0` after PKT-001, PKT-002, PKT-003, PKT-004
- `v0.2.0` after PKT-005 through PKT-008
- `v0.3.0` after PKT-009 through PKT-017
- `v0.4.0` after PKT-018 through PKT-022
- `v1.0.0` after PKT-023 and final acceptance

The AI must not create tags unless explicitly told to do so.

---

## 11. Required AI Prompts for Packet Work

When the human owner starts a packet, the preferred instruction format is:

> Read the repository files in the required order from `planning/AI_EXECUTION_RULES.md`.  
> Implement **PKT-XXX [packet title]** only.  
> Do not guess.  
> Do not implement anything outside this packet.  
> Follow Docs 1–8 and all planning files.  
> If anything is ambiguous, stop and ask.  
> Use one branch for this packet and one PR for this packet.  
> Include relevant tests.  
> Stop at the packet boundary.

The AI must obey that prompt structure.

---

## 12. Required Clarification Triggers

The AI must stop and ask the human owner if:
- a packet dependency is unclear
- a spec appears contradictory
- the correct data model for the packet is unclear
- the UX for a required state is missing
- a security rule would need interpretation
- a packet appears to require extra work not listed in scope
- a version tag seems needed but was not requested
- a PR would need unrelated files to succeed

---

## 13. What the AI Must Not Do

The AI must not:
- build the whole MVP in one sweep
- skip packet order
- merge packet scope across branches
- silently change docs
- invent extra features
- refactor unrelated code
- guess around missing details
- create release tags on its own
- commit directly to `main`

---

## 14. Final Rule

When unsure, ask.

No guessing.
