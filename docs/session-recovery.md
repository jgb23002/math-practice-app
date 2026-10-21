# Phase 18: Active session recovery and navigation safety

The application saves one active practice session on this browser and device.
Reloading `/practice/session` restores the same question, ID, four choices in the
same order, selected answer (including zero), and revealed/front state. It also
restores the session ID, plan, position, attempts, counts, previous question,
generation-error state, and remaining mistake-review queue.

Selecting or revealing an answer saves the card state but creates no attempt.
Only the student's explicit self-report records a result. Ending practice never
counts the unfinished card.

## Storage and duplicate prevention

`mathPractice.activeSession` contains a version-1 `SessionRecoverySnapshot`. The
existing global schema remains version 1; older installations need no migration
because this additional key is optional. Unknown global schema versions remain
read-only. Recovery validates the complete question, plan, ledger, totals,
selection, reveal state, and review attribution before use. Invalid recovery is
ignored with a friendly warning while independently valid categories remain.

The checkpoint contains the full live state and progress together: settings,
history, attempts, statistics, and mistake/mastery patterns. It saves synchronously
before the independent category writes on every accepted session action and
settings update. This ordering handles an interrupted multi-key save: reload uses
the coherent checkpoint instead of mixing newer attempts with older mastery.
An unsuccessful checkpoint write stops category writes and shows the existing
save warning. Practice remains usable in memory; unavailable or full storage
cannot guarantee recovery of later changes.

On completion or statistics reset, a checkpoint with `session: null` saves first.
After all category writes succeed, the recovery key is removed. If a category
write or removal fails, this temporary completion marker retains consistent
progress without restoring an active card. The next successful save finishes
cleanup. Clear All Application Data also removes the recovery key; existing
partial-deletion safeguards and warnings remain in effect.

Attempt IDs and `(sessionId, questionId)` pairs are unique. Synchronous runtime
guards, restored ledgers, and persistence deduplication reject repeated reports,
including rapid clicks and stale callbacks after reload. Recovery never replays
saved attempts to increment statistics or mastery. A completed durable session
overrides a stale active checkpoint. A newer compatible durable ledger advances
an older cursor; conflicting records are retained without replaying their card.

The checkpoint duplicates progress to provide a coherent save within localStorage's
single-key write boundary. Larger histories use additional storage and eventually
may reach the browser quota, which produces the save warning. Concurrent editing
in multiple tabs is not synchronized; this phase provides recovery for one active
application timeline, not cross-tab conflict resolution.

## Navigation behavior

Leaving the card through an application link, Back/Forward, or router navigation
opens an accessible confirmation dialog:

- **Keep Practicing** or Escape cancels navigation and restores focus.
- **Leave for Now** saves the card and opens the requested page. Other pages show
  **Resume Session**. Students can change Settings and return to the same card.
- **End Session and Leave** records completion once, clears recovery, and opens
  the requested page. The card's automatic summary redirect waits for this exit.

Starting a replacement session from setup requires a separate confirmation.
Direct session access without valid recovery redirects to setup. Direct summary
access during active practice returns to the card. Other direct routes retain
their requested page and offer resume. Completed summaries remain in memory;
completed history and statistics remain saved after reload.

The application uses a data router because
[React Router's `useBlocker`](https://reactrouter.com/api/hooks/useBlocker) handles
SPA navigation. Refresh, tab closure, and document navigation use the browser's
native `beforeunload` prompt while a session is active. It disappears after
completion, ending, reset, or clear. The browser controls this prompt's wording
and buttons; mobile termination and pages without prior user interaction may not
show it. Saves happen during ordinary actions, with additional best-effort saves
on hidden visibility and page exit, so recovery does not depend on an unload
event being delivered. See the
[HTML navigation specification](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-beforeunloadevent-interface)
for browser-controlled unload prompting.

## Verification

```bash
npm test
npm run lint
npm run format:check
npm run build
npm run check:session-recovery
npm run check:responsive
```

The browser checks launch a temporary Vite server and isolated Chrome/Chromium
profile, then remove that profile and stop their processes. Existing user data is
not accessed. Set `CHROME_BIN` if the executable is not in a standard location.
Optional screenshots use `RESPONSIVE_SCREENSHOT_DIR=/tmp/math-practice-recovery`.

Unit/component checks cover fixed lengths 5/10/20 and continuous practice, saved
selection/reveal, exact progress, replay prevention, review attribution and mastery,
multiple-pattern queue recovery, corrupted checkpoints, interrupted saves,
completion cleanup, resets, unsupported schemas, retryable question errors,
confirmation/focus behavior, Back/Forward, and direct routes. Native Chrome checks
verify refresh cancel/accept, restored front/back cards, result counts, pause/resume,
keyboard activation, history navigation, ending, completion without prompts, and
dialog layouts at 1440×900, 768×1024, 320×568, and 640×360. The existing 133-state
responsive regression suite also passes.

Manually verify native refresh, tab-close, and external-navigation prompts in
Firefox and Safari, including mobile browsers; their native UI is browser-specific.
Check the dialog with a screen reader, OS text scaling, and 200% browser zoom.
Force-close a mobile browser and reopen it to verify recovery when no exit event
is delivered. Deny storage access or fill the quota and confirm the save warning;
clearing browser data necessarily removes recovery and saved history.
