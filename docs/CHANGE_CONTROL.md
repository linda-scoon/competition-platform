# Change Control

## Rule
The files in `docs/` are source-of-truth documents.

## AI behavior
The AI must not modify these files unless the human owner explicitly asks for a documentation update.

## Conflict handling
If the AI finds a contradiction or ambiguity:
1. stop implementation for the affected packet
2. report the exact conflict
3. ask the human owner for clarification
