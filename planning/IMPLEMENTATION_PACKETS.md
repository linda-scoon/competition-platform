# Implementation Packets

All packets below are ordered.

## Packet execution rule
One packet at a time.

## Packet list

### PKT-001 Repository Foundation
- status: ready
- dependency type: sequential
- depends on: none
- goal: create application scaffold, tooling, base folders, linting, formatting, env handling, and CI baseline

### PKT-002 Auth Foundation
- status: ready
- dependency type: sequential
- depends on: PKT-001
- goal: implement sign-up, sign-in, sign-out, session handling, and return-to-origin flow

### PKT-003 Core Database Schema
- status: ready
- dependency type: sequential
- depends on: PKT-001
- goal: create initial schema for users, challenges, participants, runs, verifier requests, verifier pool, notifications, audit log, media assets, and blocks

### PKT-004 Public Shell and Navigation
- status: ready
- dependency type: parallel-safe
- depends on: PKT-001
- goal: implement public shell, auth shell placeholder, admin shell placeholder, top nav, and footer

### PKT-005 Challenge Create/Edit Foundation
- status: ready
- dependency type: sequential
- depends on: PKT-002, PKT-003, PKT-004
- goal: implement challenge draft creation and edit flows before publish

### PKT-006 Challenge Publish + AI Moderation
- status: ready
- dependency type: sequential
- depends on: PKT-005
- goal: implement publish flow and immediate AI moderation for public challenge content

### PKT-007 Challenge Discovery + Public Detail
- status: ready
- dependency type: sequential
- depends on: PKT-006, PKT-004
- goal: implement challenge directory and challenge detail public rendering

### PKT-008 Join Challenge + Soft Lock
- status: ready
- dependency type: sequential
- depends on: PKT-007
- goal: implement join challenge behavior and first-participant soft lock

### PKT-009 Verifier Eligibility Requests
- status: ready
- dependency type: sequential
- depends on: PKT-002, PKT-003, PKT-004
- goal: implement verifier eligibility request page and data flow

### PKT-010 Admin Verifier Request Review
- status: ready
- dependency type: sequential
- depends on: PKT-009
- goal: implement admin review for verifier eligibility requests

### PKT-011 Challenge Verifier Assignment
- status: ready
- dependency type: sequential
- depends on: PKT-010, PKT-007
- goal: implement creator assignment of verifiers from approved pool

### PKT-012 Run Submission
- status: ready
- dependency type: sequential
- depends on: PKT-008, PKT-007, PKT-003
- goal: implement run submission with external video link and immediate submission lock

### PKT-013 Review Queue + Claiming
- status: ready
- dependency type: sequential
- depends on: PKT-011, PKT-012
- goal: implement verifier queue visibility and claim mechanism

### PKT-014 Verification Decisions + Leaderboard
- status: ready
- dependency type: sequential
- depends on: PKT-013
- goal: implement approve/reject/correction decisions and leaderboard recalculation

### PKT-015 Conflict Auto-Removal
- status: ready
- dependency type: sequential
- depends on: PKT-011, PKT-012
- goal: auto-remove verifier assignment if verifier later joins or submits to same challenge

### PKT-016 Full Lock + Closed + Finalized
- status: ready
- dependency type: sequential
- depends on: PKT-012, PKT-014
- goal: implement full lock, close, and finalize transitions

### PKT-017 Fallback Vote and Fallback Verification
- status: ready
- dependency type: sequential
- depends on: PKT-014, PKT-015, PKT-016
- goal: implement no-verifier close alert, participant vote, and restricted fallback verification

### PKT-018 Media Library Upload + Admin Moderation
- status: ready
- dependency type: sequential
- depends on: PKT-002, PKT-003
- goal: implement image upload, pending state, and admin moderation

### PKT-019 Public Profiles + Contact Relay + Blocking
- status: ready
- dependency type: sequential
- depends on: PKT-002, PKT-003, PKT-007, PKT-018
- goal: implement profiles, contact relay, contactability settings, and block logic

### PKT-020 Notifications Center
- status: ready
- dependency type: parallel-safe
- depends on: PKT-003, PKT-004
- goal: implement notifications storage and UI

### PKT-021 Admin Operations Pages
- status: ready
- dependency type: sequential
- depends on: PKT-010, PKT-014, PKT-017, PKT-018, PKT-019, PKT-020
- goal: implement admin dashboards for logs, runs, challenges, users, AI moderation, and unresolved filters

### PKT-022 PWA Setup
- status: ready
- dependency type: parallel-safe
- depends on: PKT-004
- goal: add manifest, icons, installable shell, and safe caching

### PKT-023 Final Hardening Pass
- status: ready
- dependency type: sequential
- depends on: all previous packets
- goal: run focused hardening on permissions, audit coverage, accessibility gaps, and edge-case tests
