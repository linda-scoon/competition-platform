# Local Workflow Notes

Because this repo is currently being developed by one owner on the main branch:

- PRs are not mandatory right now.
- The AI must still behave as if packet boundaries are real.
- The human owner should review each packet-sized change set before allowing the next packet.

## Recommended local loop
1. AI implements one packet
2. Human reviews the packet
3. Human commits or accepts the packet
4. AI proceeds to next unblocked packet

## Forbidden behavior
- giant all-at-once implementation
- skipping packet order
- silently continuing through ambiguity
