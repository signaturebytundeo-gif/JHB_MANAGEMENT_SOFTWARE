# Codebase Concerns

**Analysis Date:** 2026-02-13

## Tech Debt

**Monolithic gsd-tools.js CLI:**
- Issue: Core utility contains 4,597 lines of JavaScript in a single file implementing 50+ distinct operations (git operations, markdown parsing, YAML frontmatter extraction, phase management, state updates, verification, templating)
- Files: `get-shit-done/bin/gsd-tools.js`
- Impact:
  - Difficult to test individual operations — 75 tests cover mostly high-level workflows
  - Any change risks breaking multiple operations due to shared helpers
  - Function discovery is non-obvious for maintainers
  - Future contributors must understand entire file structure
- Fix approach: Refactor into modules:
  - `gsd-tools/git.js` — git operations (execGit, isGitIgnored, commit)
  - `gsd-tools/markdown.js` — markdown parsing (extractFrontmatter, parseYAML, phase extraction)
  - `gsd-tools/state.js` — STATE.md operations (update, patch, advance-plan, record-metric)
  - `gsd-tools/phase.js` — phase operations (add, insert, remove, complete)
  - `gsd-tools/validation.js` — verification (validate consistency, frontmatter validation)
  - `gsd-tools/init.js` — initialization commands
  - Create index.js that exports all operations and route based on command name

**Weak error handling in file operations:**
- Issue: Many try-catch blocks silently ignore errors with empty catch clauses (`} catch {}`), making it impossible to diagnose failures
- Files: `get-shit-done/bin/gsd-tools.js` (appears ~50 times), `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`
- Impact:
  - Users see "command failed" with no error message when phase directories don't exist or ROADMAP.md is malformed
  - Silent failures in state updates lose user data undetected
  - Debugging requires adding console.error statements temporarily
- Fix approach:
  - Add error context function: `catch (e) { error(\`Phase directory read failed: ${e.message}\`); }`
  - Create error classification: distinguish file-not-found (expected in some cases) from permission/parse errors (problems)
  - Route critical errors to `error()` function, non-critical to debug logging

**Test coverage gaps for edge cases:**
- Issue: 75 tests exist but skip complex scenarios — decimal phase insertion, whitespace handling in YAML, malformed frontmatter recovery
- Files: `get-shit-done/bin/gsd-tools.test.js` (2,033 lines)
- Impact:
  - Phase `1.1` insertion after phase `1` (decimal phase handling) not tested
  - Comments in YAML frontmatter cause silent parsing failures
  - Plans with missing frontmatter 'wave' field pass validation but crash executor
- Fix approach:
  - Add test suites:
    - Decimal phase numbering with gaps and out-of-order directories
    - Malformed YAML with comments, trailing commas, invalid indent
    - Missing required fields (phase, wave, name, type)
    - Empty files, symlinks, permission-denied scenarios
  - Use snapshot testing for complex YAML parsing

## Known Bugs

**Claude Code classifyHandoffIfNeeded false failures:**
- Symptoms: Execute-phase and quick workflows report agent failure but output is actually correct (spotcheck reveals success)
- Files: `get-shit-done/workflows/execute-plan.md`, `get-shit-done/workflows/quick.md`, `agents/gsd-executor.md`
- Trigger: Occurs randomly during subagent completion detection in Claude Code
- Workaround: Workflows now verify actual output before reporting failure — reduces false positives but doesn't eliminate root cause
- Status: Acknowledged in CHANGELOG.md v1.17.0 as "Claude Code bug #13898" — waiting on Claude Code team fix

**Installer doesn't validate XDG_CONFIG_HOME format:**
- Symptoms: If XDG_CONFIG_HOME is set to invalid path (e.g., relative path, symlink loop), OpenCode installation fails silently
- Files: `bin/install.js` (getOpencodeGlobalDir function)
- Trigger: Non-standard environment variable setup on Linux/macOS
- Workaround: None — users must manually fix XDG_CONFIG_HOME
- Fix approach: Validate path is absolute and accessible before using it

**Phase removal doesn't fully update ROADMAP dependencies:**
- Symptoms: If Phase 2 is removed, Phase 3's "Depends on: Phase 2" reference becomes stale (points to non-existent phase)
- Files: `get-shit-done/bin/gsd-tools.js` (cmdPhaseRemove function)
- Trigger: Running `gsd-tools phase remove 2`
- Workaround: Manually update ROADMAP.md dependency references after removal
- Fix approach: Enhance cmdPhaseRemove to scan remaining phases and update "Depends on:" references

## Security Considerations

**Git command injection via unescaped user input:**
- Risk: Phase names, plan descriptions, and other user-supplied strings are interpolated into git commands
- Files: `get-shit-done/bin/gsd-tools.js` (execGit function, line 228)
- Current mitigation:
  - execGit validates arguments with regex `/^[a-zA-Z0-9._\-/=:@]+$/` and wraps others in single quotes with escape
  - Git commands never eval() or spawn uncontrolled shell
- Recommendations:
  - Add unit tests for special characters: spaces, backslashes, newlines, backticks, `$()` expressions
  - Consider using `git` library instead of execSync for production systems
  - Document that phase/plan names should avoid special characters (enforced via slug generation)

**No input validation on frontmatter fields:**
- Risk: YAML frontmatter parsed without schema validation — arbitrary nested structures could cause DOS or memory issues
- Files: `get-shit-done/bin/gsd-tools.js` (extractFrontmatter function, lines 252-300)
- Current mitigation: Manual field access (e.g., `fm.wave`) — doesn't validate structure exists
- Recommendations:
  - Create schema validator for plan/summary frontmatter (required fields: phase, wave, name, type)
  - Reject frontmatter with unexpected nested depth (>3 levels)
  - Sanitize string values (max 500 chars, no control characters)

**Brave API key storage in plaintext:**
- Risk: Brave Search API key stored in `~/.gsd/brave_api_key` with file permissions depending on system umask
- Files: `get-shit-done/bin/gsd-tools.js` (line 3738)
- Current mitigation: File is user-owned, but not explicitly chmod 600
- Recommendations:
  - Ensure brave_api_key file created with mode 0600
  - Document that API keys should never be committed to git (add to .gitignore template)
  - Consider reading from BRAVE_API_KEY env var only, not storing on disk

## Performance Bottlenecks

**Roadmap analysis scans entire directory tree on every command:**
- Problem: cmdRoadmapAnalyze reads all phase directories, counts files, extracts frontmatter on every invocation
- Files: `get-shit-done/bin/gsd-tools.js` (cmdRoadmapAnalyze function, lines 2398-2535)
- Cause: No caching — repeated calls (progress command, executor status checks) re-parse identical files
- Impact:
  - Projects with 30+ phases see 1-2 second delays per status check
  - Multi-plan phases scan 100+ files each time
  - Scales O(phases × files_per_phase)
- Improvement path:
  - Add file mtime-based cache in `.planning/.gsd-cache/roadmap.json`
  - Invalidate cache when ROADMAP.md or phase directories change
  - Return cached result if mtime unchanged
  - Expected speedup: 10-20x for status checks

**execSync() with stdio 'pipe' blocks during large commits:**
- Problem: Git operations use `execSync(..., { stdio: 'pipe' })` which buffers entire output in memory
- Files: `get-shit-done/bin/gsd-tools.js` (execGit function, cmdCommit)
- Cause: Planning documents can exceed 100KB (large phases with many plans)
- Impact:
  - Commits with multiple docs slow down noticeably
  - Memory usage spikes on constrained systems
- Improvement path:
  - For large documents (>50KB), use streaming instead of execSync
  - Or split commits into batches by file size
  - Or use git staging + direct write rather than CLI invocation

**Nested YAML frontmatter parsing is O(n²):**
- Problem: extractFrontmatter uses stack-based parser that re-scans indentation on every line
- Files: `get-shit-done/bin/gsd-tools.js` (lines 252-300)
- Cause: While loop with regex match on each line
- Impact:
  - Rare in practice (frontmatter typically <50 lines) but inefficient
  - No performance issue currently, but scales poorly with larger frontmatter
- Improvement path:
  - Use standard YAML parser (js-yaml) instead of manual parsing
  - Reduces code duplication and eliminates custom bugs

## Fragile Areas

**Phase directory naming is position-dependent:**
- Files: `get-shit-done/bin/gsd-tools.js` (normalizePhaseName, phase operations)
- Why fragile:
  - Directory format: `02-foundation` — if user manually creates `2-foundation`, phase numbering breaks
  - Decimal phases require exact format: `02.1-name` not `2.1-name`
  - Sorting by directory name assumes zero-padded numbers (ASCII sort works)
  - Safe modification: Never allow direct directory creation — always use `gsd-tools phase add`
  - Test coverage: Missing tests for unsorted directories, invalid naming formats
  - Recommendation: Add "phase directory validation" to `validate consistency` command

**ROADMAP.md parsing uses brittle regex:**
- Files: `get-shit-done/bin/gsd-tools.js` (phasePattern = `/###\s*Phase\s+(\d+(?:\.\d+)?)\s*:/gi`)
- Why fragile:
  - Fails if ROADMAP has extra whitespace: `###  Phase  1  :` (multiple spaces before colon)
  - Doesn't tolerate markdown variations: `## Phase 1` (h2 instead of h3) reads as 0 matches
  - If user edits ROADMAP manually (adds comment, reformats), phase discovery fails silently
  - Safe modification: Validate ROADMAP format in phase operations before parsing
  - Test coverage: Only tests clean, auto-generated ROADMAP.md
  - Recommendation: Add strict ROADMAP format validation with helpful error messages

**Git integration assumes git is available:**
- Files: `get-shit-done/bin/gsd-tools.js` (execGit, isGitIgnored, cmdCommit)
- Why fragile:
  - No fallback if git not found — execSync throws and caller catches silently
  - WSL users with git installed in Windows but not WSL see `git not found` errors
  - CI environments may have git but with unusual configuration
  - Safe modification: Detect git availability upfront in init commands
  - Test coverage: Tests don't mock git or test non-git environments
  - Recommendation: Add check before workflows start; inform user if git unavailable

**Agent prompt context loading is linear, not differential:**
- Files: Multiple `init` commands in gsd-tools.js load entire STATE.md, ROADMAP.md, all phase summaries on every invocation
- Why fragile:
  - 50KB ROADMAP + 30 phase summaries = 200KB+ of repeat context per agent
  - No way to say "only show diff from last run"
  - Workflow context bloat accumulates across 10+ agent invocations
  - Safe modification: Cache context digest; only pass changes to subsequent agents
  - Test coverage: No context budget tests
  - Recommendation: Profile actual context usage; implement differential loading

## Scaling Limits

**Single phase directory can't exceed ~200 plans:**
- Current capacity: filesystem supports unlimited files, but:
  - `fs.readdirSync()` reads entire directory into memory
  - Phase operations iterate all plans to find gaps, check summaries
  - Sorting 200+ files each invocation becomes noticeable
- Limit: Hits ~1-2 second threshold around 300+ plans per phase
- Scaling path:
  - For very large phases: use subdirectories (e.g., `.planning/phases/10/01-60`, `.planning/phases/10/61-120`)
  - Or implement plan index file (`.planning/phases/10/plan-index.json`)
  - Document recommendation: Break phases >100 plans into sub-phases

**Project state in single STATE.md file:**
- Current capacity: ~50-100 KB comfortable, degrades after 500 KB
- Limit: Git operations slow as file grows; diffs become hard to read
- Scaling path:
  - Archive completed phases: move phase summaries to separate files
  - Implement STATE.md rotation: move old entries to STATE-archive.md monthly
  - Document: milestones should last <3 months before rotation

**Agent count in ROADMAP approaches maintainability limit:**
- Current capacity: ~50 phases comfortable
- Limit: Beyond that, ROADMAP becomes 100+ KB; agent initialization loads full file each time
- Scaling path:
  - For 100+ phase projects: split into milestones earlier
  - Implement phase grouping in ROADMAP for readability
  - Consider separate ROADMAP per milestone

## Dependencies at Risk

**Removed Node.js versions:**
- Risk: Package.json specifies `engines: ">=16.7.0"` but Node 16 reached EOL (2023-09-11)
- Impact: Users on Node 16 don't receive security updates; new npm packages drop Node 16 support
- Migration plan: Bump minimum to Node 18.x (LTS, active until 2025-04); update package.json and CI
- Timeline: Do this when Node 16 ecosystem fragmentation becomes clear

**No production dependencies = risky during language shifts:**
- Risk: Zero npm dependencies means no semver lock; if Node.js built-in APIs change, no fallback
- Impact: If `execSync` behavior changes between Node versions, no compatible wrapper available
- Migration plan: If breaking changes occur, add thin wrapper library and pin version
- Current status: Acceptable risk given Node stability track record

## Missing Critical Features

**No authentication/authorization:**
- Problem: GSD has no concept of user identity — all commands accessible to anyone with filesystem access
- Blocks: Multi-user projects, restricted plan visibility, audit trails
- Workaround: None — users on shared machines have full access to all .planning/ files
- Impact: Low risk for solo developers; becomes concern for team GSD instances

**No conflict resolution for concurrent edits:**
- Problem: If two agents run simultaneously and both update STATE.md, one change is lost (last-write-wins)
- Blocks: Parallel phase execution (current parallelization flag has no actual locking)
- Workaround: Run only one workflow at a time (documented but not enforced)
- Impact: Could silently lose plan counter increments, state updates
- Fix approach: Add file-level locking (e.g., lockfile in .planning/.lock) or git conflict detection

**No test coverage for Windows paths:**
- Problem: gsd-tools assumes POSIX paths; Windows backslashes may not be handled correctly
- Blocks: Full Windows support despite installer supporting it
- Workaround: CHANGELOG 1.16 notes "normalized backslash paths" but tests don't cover Windows-specific scenarios
- Impact: Users on Windows may see path errors or commit failures
- Fix approach: Add Windows-specific tests; use path.normalize() everywhere paths are constructed

## Test Coverage Gaps

**Phase operations not tested for disk state mismatches:**
- What's not tested: Phase directories exist but ROADMAP doesn't mention them; phases in ROADMAP with no disk directory; out-of-order directories
- Files: `get-shit-done/bin/gsd-tools.test.js` (missing test cases in phase operations section)
- Risk: cmdPhaseRemove could delete wrong directory if naming assumptions break
- Priority: High

**Frontmatter validation not tested for schema compliance:**
- What's not tested: Missing required fields (phase, wave, type); extra fields; nested objects with wrong structure; circular references
- Files: `get-shit-done/bin/gsd-tools.test.js` (frontmatter validation tests sparse)
- Risk: Executor crashes when accessing undefined fields (e.g., `fm.wave` when wave key missing)
- Priority: High

**Git operations not tested in non-git projects:**
- What's not tested: Running gsd-tools in directory without .git; behavior when git is unavailable; permission denied on commits
- Files: `get-shit-done/bin/gsd-tools.test.js`
- Risk: Unclear error messages when git operations fail
- Priority: Medium

**Complex YAML not tested:**
- What's not tested: Comments in YAML, trailing commas, quoted keys, complex nested structures, Unicode in values
- Files: `get-shit-done/bin/gsd-tools.test.js`
- Risk: User frontmatter with comments parsed incorrectly; state updates lose data
- Priority: Medium

**Install process edge cases not tested:**
- What's not tested: Symlinked config directories, permissions denied on ~/.claude creation, existing partial installations, corrupted config.json
- Files: `bin/install.js` (no tests)
- Risk: Installation hangs or leaves broken state
- Priority: Medium

---

*Concerns audit: 2026-02-13*
