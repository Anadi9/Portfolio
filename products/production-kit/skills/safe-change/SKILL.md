---
name: safe-change
description: Working discipline for changing an existing app without breaking what already works. Use for any bug fix, feature addition or refactor in a codebase that has real users or working features, especially when the user says things like "fix this without breaking anything", "it keeps breaking other things", "the AI rewrote my whole file", or "it worked yesterday".
---

# Safe change

The most expensive failure in AI-assisted development is a fix that breaks something else. This skill trades a little speed for changes that stay fixed.

## 1. Checkpoint first

- Run `git status`. If there are uncommitted changes, ask the user whether to commit them as a checkpoint before starting ("wip: before <task>"). Never discard them.
- If the project isn't in git, recommend `git init` and a first commit before changing anything. It's the only reliable undo.
- Note the current state of the checks: run `npm run build` (and `npm test`, `npm run lint`, type check, if they exist) and record which already fail. You're responsible for not adding failures, and you need to know which ones were already there.

## 2. Understand and reproduce

- Restate the task in one or two sentences: current behavior, expected behavior. If the request is vague ("make it better", "fix the dashboard"), ask one clarifying question instead of guessing.
- For bugs, reproduce before fixing. Find the exact steps, the error message, the console output, the failing request. If you can't reproduce it, say so and collect more information (logs, screenshots, the exact URL) rather than changing code on a hunch.
- Read the code involved and its callers before editing. Search for every usage of any function, component, type or column you're about to change.
- Identify the root cause. State it plainly. If you're fixing a symptom (e.g. adding a null check) because the cause is elsewhere, say that.

## 3. Plan the smallest diff

- Change the fewest files and lines that solve the problem.
- Don't, unless asked:
  - rewrite or reformat working code
  - rename files, functions, variables or routes
  - change libraries, state management, styling approach or folder structure
  - upgrade dependencies
  - "clean up" nearby code
  - delete code you don't understand
- If the right fix really is larger (e.g. the architecture causes the bug), explain why and get agreement first.
- For database changes: new migration file, additive where possible (add a column rather than rename one), and explicit confirmation from the user for anything that drops or rewrites data.
- For multi-step work, break it into steps that each leave the app working, and do them one at a time.

## 4. Make the change

- Follow the patterns already in the codebase (how it fetches data, handles errors, names things, styles components).
- Keep public interfaces stable: component props, function signatures, API response shapes, database columns. If one must change, update every caller in the same change.
- Handle the error and loading states of any code you add.
- No secrets in code, no disabling of lint/type rules, no `// @ts-ignore` or `any` to silence errors without explaining why.

## 5. Verify

Verification means running something and reading the result:
- Build, type check, lint, tests: run them and compare with the baseline from step 1.
- Reproduce the original bug steps again: it should be gone.
- Check the neighbours: other pages or flows that use the code you changed. List what you checked.
- For UI changes, check mobile width and the loading/error/empty states.
- For auth or data changes, test as a logged-out user and as a second user.

If something can't be verified by you (needs a browser session, a real email, production data), give the user a short manual test script: steps and expected results.

Never say "done", "fixed" or "should work now" without stating what was actually run and what it showed.

## 6. Report and checkpoint

End with:
- **Root cause** (bugs) or **what was added** (features), in a sentence or two.
- **Files changed**, one line each on what changed.
- **Verified**: the commands run and their results; what you tested by hand.
- **Not verified / risks**: anything you couldn't check.
- **User actions**: migrations to run, env vars to set, dashboard settings, redeploy.
- **Noticed but didn't touch**: other problems spotted, for a later task.

Then suggest a commit with a clear message (`fix: prevent duplicate orders on double-click`) so this working state is saved before the next change.

## When things go wrong

- If a change breaks something and the fix isn't obvious within one attempt, revert to the checkpoint (`git restore <file>` or `git stash`) and rethink, rather than stacking fixes on fixes.
- If you've tried two approaches and neither works, stop and report what you've learned, what you ruled out, and what information would help.
