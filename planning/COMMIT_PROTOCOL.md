# Commit Protocol

## Working model
This repository is currently using direct push to the main branch by the owner.

## AI rule
The AI must still work in packet-sized slices.

## Packet-sized commit rule
One packet must correspond to one isolated change set.

That means:
- do not mix unrelated packets
- do not bundle future work
- do not include opportunistic cleanup

## Commit message format
Use this format:

`PKT-XXX: short exact summary`

Example:
`PKT-008: implement join challenge and soft lock trigger`

## Commit hygiene
- Keep commits readable.
- If multiple commits are required within one packet, all commits must still belong only to that packet.
- Do not start the next packet’s code in the current packet’s commit group.
