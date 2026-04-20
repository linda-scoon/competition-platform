# Definition of Done

A packet is done only when all of the following are true:

1. The code changes implement only the packet scope.
2. The code follows Docs 1–8 and does not contradict them.
3. Relevant tests for the packet exist and pass.
4. Linting and type checks pass.
5. No unrelated files were modified without explicit necessity.
6. UI work matches the UX and design system docs for the affected surfaces.
7. Permission and security rules are enforced server-side where relevant.
8. The implementation notes clearly state:
   - what was changed
   - what was not changed
   - any known limitations
   - any blocked follow-up items
9. The packet acceptance criteria are satisfied.
10. If any uncertainty remains, the packet is not done and the AI must ask.

## Not done
A packet is not done if:
- it adds extra scope
- it leaves known contradictions unexplained
- it relies on TODOs for core functionality
- it requires the human reviewer to guess what changed
