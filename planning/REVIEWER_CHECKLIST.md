# Reviewer Checklist

Use this for every implementation slice.

## Scope
- Does this work match one implementation packet only?
- Did it avoid unrelated changes?

## Specification alignment
- Does it match Docs 1–8?
- Did the AI ask rather than guess where needed?

## UI / UX
- Does UI match Doc 4 and Doc 6?
- Are all required states handled?

## Behavior
- Do permissions match Doc 2 and Doc 7?
- Are state transitions implemented correctly?

## Security
- Are server-side checks present?
- Is any sensitive action missing audit logging?

## Quality
- Are tests present and relevant?
- Are lint/type checks clean?
- Is the implementation understandable and reviewable?

## Decision
- Accept current packet
- Request changes
- Block and clarify spec
