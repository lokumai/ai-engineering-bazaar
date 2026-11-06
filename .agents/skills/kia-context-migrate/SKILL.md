---
name: kia-context-migrate
description: Brings an existing kiacontext installation up to the current harness version — reads the version this project is stamped with, applies only the changes since then, moves content rather than recreating it, and updates the stamp last. Use after re-running the installer on a project that already had kiacontext, or when the installer says this project is behind.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# kia-context-migrate — bring an existing install up to date

The installer refreshes the instructions block and the skills. It deliberately never
touches a context file you already have, because those hold your project, not ours.
So when the harness changes shape, somebody has to move the content. That is this.

## The three rules

1. **Never lose content.** Every step here moves text or renames a file. If a step
   would delete something you cannot reconstruct, stop and ask.
2. **Never renumber.** Milestone, decision and rule numbers are cited from code
   comments and from other documents. A renumber breaks every citation silently.
3. **The stamp goes last.** `harness:` in `kia-context/INDEX.md` means *migrated to*,
   not *installer ran*. Bump it only when every hop below has actually been applied
   and verified. A half-applied migration that looks finished is the worst outcome.

## Step 1 — find out where this project is

```bash
grep -n '^harness:' kia-context/INDEX.md 2>/dev/null || echo "no stamp"
ls -d context kia-context 2>/dev/null
```

**A `context/` folder outranks the stamp.** Read that row first — an older installer
may have scaffolded a fresh `kia-context/` beside the real content, and its stamp
reports the version that was *installed*, not the one this project's documents are
actually in.

| What you see | Where it is |
|---|---|
| a `context/` folder, whatever the stamp says | apply **v0.1 → v0.2**, then **v0.2 → v0.3** |
| `harness: kiacontext v0.3`, and no `context/` | current — stop, there is nothing to do |
| `harness: kiacontext v0.2` | apply hop **v0.2 → v0.3** |
| no stamp, but `kia-context/` exists | somebody edited the frontmatter. Work out which hops apply from their *Already applied?* checks below, then add the stamp. |

Apply hops **in order**. Each one is safe to run twice — check *Already applied?*
first and skip the hop if it is already true.

**Run every command from the repository root**; all paths below are relative to it.
Both hops rename files with `git mv` — if it reports a file is not tracked, use plain
`mv` and carry on.

---

## Step 2 — hop v0.1 → v0.2: `context/` became `kia-context/`

**What changed.** The harness folder was renamed so it no longer collides with a
`context/` directory a project may already own. A leading dot was considered and
rejected: ripgrep skips hidden directories by default, so the one folder agents are
told to read every session would have been invisible to the most common search tool.

**Already applied?** `kia-context/` exists and `context/` does not.

**First, check for a collision.** If **both** folders exist, an installer scaffolded
an empty `kia-context/` beside your real content. Never `git mv` onto it — git would
nest the whole thing at `kia-context/context/` and bury it.

```bash
ls kia-context 2>/dev/null && grep -rl '{{' kia-context | wc -l
```

Every file in it should still be full of `{{...}}` placeholders. If so it is
untouched boilerplate — delete it and continue:

```bash
rm -rf kia-context
```

If any file in it has real content, **stop and ask.** Two filled harnesses is not
something to merge unattended.

**Do.**

```bash
git mv context kia-context
grep -rn "context/" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=kia-context
```

Fix every hit the grep finds that means the harness folder — prose links, paths in
scripts, CI config, editor settings. Leave anything that is a different `context/`
alone, and leave the repository URL alone if this is kia-context itself.

**Do not** copy the folder and delete the original. `git mv` keeps the history, and
these files are the record of how the project got its shape.

**Verify.** `ls kia-context/INDEX.md` resolves, and the grep above returns nothing
that refers to the harness.

---

## Step 3 — hop v0.2 → v0.3: the active log keeps the bare name

**What changed, and why it matters.** Splitting a log used to leave the history in
`PROGRESS.md` and open `PROGRESS_2.md` for new work. That put the *live* file behind
a name nothing pointed at, and closed the file holding `## The loop` and
`## Circuit breakers` — the operating procedure for every milestone. Agents then
correctly worked in the active part, never saw the procedure, and milestones quietly
stopped carrying checkboxes. Nothing errors when that happens; the harness is prose.

Now the active part **always** keeps the bare name, and closed history moves out to
`PROGRESS_1.md`, `PROGRESS_2.md`, … So the procedure can never be stranded, and
"`logs/PROGRESS.md` holds the current milestone" is true forever.

**Already applied?** No log whose name carries no `_n` suffix is `status: closed` —
check every file, not just `PROGRESS.md`. A project that split `BRAINSTORM.md` and
not `PROGRESS.md` still needs this hop.

```bash
grep -n '^status:' kia-context/logs/*.md
```

If every bare-named log is already `active`, 3a and 3b are done — still run *3c*,
which is worth checking regardless. A project that never split has nothing to do in
3a or 3b either.

### 3a. Rename, oldest first

```bash
ls kia-context/logs/
grep -n '^status:\|^covers:' kia-context/logs/PROGRESS*.md
```

Put the parts in chronological order — the one with the lowest milestone numbers is
oldest. Exactly one should be `status: active`; it is the newest.

Rename so the **active part becomes `PROGRESS.md`** and the closed parts become
`PROGRESS_1.md`, `PROGRESS_2.md`, … oldest first. Move the current `PROGRESS.md` out
of the way **before** moving the active part in, or you will overwrite it:

```bash
# two parts: PROGRESS.md (closed, oldest) + PROGRESS_2.md (active)
git mv kia-context/logs/PROGRESS.md   kia-context/logs/PROGRESS_1.md
git mv kia-context/logs/PROGRESS_2.md kia-context/logs/PROGRESS.md
```

With three parts the middle one already has the right name and stays put: the oldest
becomes `_1`, the middle stays `_2`, the active one becomes the bare name.

Do the same for `BRAINSTORM.md` if it has been split.

### 3b. Repoint the navigation and the index

Each part carries a `← Previous` / `Next →` block at its top **and** its bottom.
Rewrite them for the new names — the logs are a linked list and those blocks are how
a reader walks it. The newest part's `Next →` is `none yet`; the oldest part's
`← Previous` is `none. This is part one.`

Then update `kia-context/INDEX.md`: the phase table's **Log** column now names
`logs/PROGRESS.md` for the active phase and `logs/PROGRESS_1.md` for older ones.
Finally, grep for the names you actually changed — and only those. With three parts
the middle one kept its name, so its references are correct and must not be touched:

```bash
# whatever the highest part number was before you started, e.g. PROGRESS_3
grep -rn "PROGRESS_3" . --exclude-dir=.git --exclude-dir=node_modules
```

### 3c. Put the procedure back in the active file

The active `PROGRESS.md` must carry `## The loop` and `## Circuit breakers`. After a
split they are usually sitting in a part that is now archived.

```bash
grep -ln "## The loop" kia-context/logs/PROGRESS*.md
```

If they are only in an archived part, **move** them — cut from the archive, paste
into the active `PROGRESS.md` above the milestones. Do not leave a copy in both:
harness rule 3 says one file states a rule and the rest link to it.

Rule 4 — *a closed file stays closed* — keeps new **entries** out of an archive.
Lifting the operating procedure back out of one is not an entry; it is the repair,
and it is the whole reason this hop exists.

If no part has them, or the copy you find is truncated, write this — it is the
canonical text, and `AGENTS.md` does not carry it (the block there states the shape
a milestone must have, not the procedure itself):

```markdown
## The loop

1. Take the first unchecked deliverable (`- [ ]`) under the active milestone.
2. Build it. Verify it against its **acceptance criteria**.
3. **Pass:** mark `[x]`, write a one or two sentence **Report**, move on.
4. **Fail:** apply the circuit breakers. Do **not** mark `[x]`.

## Circuit breakers

- **Three attempts.** Three consecutive failed verification passes on one deliverable
  and you stop.
- **Then:** revert the uncommitted work, mark the deliverable `[BLOCKED]`, write one
  paragraph on what was tried and what it did, and halt for a human.
- **No tampering, ever.** Never modify a test, a verifier or an acceptance criterion
  to force a pass. If a criterion is genuinely wrong, say so in the report and leave
  it failing until a human changes it.
- **Never fake progress.** A blocked deliverable that is honest is worth more than a
  ticked one that lies.
```

### 3d. Report the milestones that drifted

While the procedure was stranded, milestones may have stopped carrying the one shape
the loop depends on: **deliverables and acceptance criteria as `- [ ]` checkboxes,
ticked `[x]` as each lands, closing with a dated report.** Step 1 of the loop is
"take the first unchecked deliverable" — without a checkbox there is nothing to take.

```bash
grep -c '^- \[ \]\|^- \[x\]' kia-context/logs/PROGRESS.md
grep -n '^## 🏁 Milestone\|^## Milestone' kia-context/logs/PROGRESS.md
```

For each milestone in the active part, check it has a deliverables list as
checkboxes. Then:

- **A numbered or bulleted list of deliverables** → reformat to `- [ ]`, and tick
  `[x]` only where the milestone's own report says that item landed.
- **No deliverables section at all** → **do not invent one.** List that milestone in
  your report for a human to fill in. Writing plausible deliverables after the fact
  produces a document that looks checked and is not.

Leave the **milestones** in archived parts as they are. History belongs to the part
that recorded it.

**Verify.** `PROGRESS.md` is `status: active`, carries the loop and the circuit
breakers, and every milestone you reformatted has checkboxes. The numbering runs
continuously across the parts with no restart.

---

## Step 4 — bump the stamp, last

Only once every hop above is applied and verified:

```bash
grep -n '^harness:' kia-context/INDEX.md
```

Set it to `harness: kiacontext v0.3`, and set `last_updated:` on every file you
touched to today's date.

## Step 5 — report

- which hops you applied, and which were already in place;
- every file you renamed, and every block of text you moved;
- **the milestones you could not repair, and what a human needs to supply** — this
  is the part worth reading, so do not bury it;
- anything you found that looked wrong but was out of scope.

If the installer left `*.kiacontext-bak` files beside `AGENTS.md` or a `SKILL.md`,
say so: they hold the previous version, and they are safe to delete once the human
has looked.
