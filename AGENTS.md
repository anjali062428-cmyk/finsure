# FinSure Agent Rules

## Mission
Build FinSure as a production-style, evidence-backed fintech fraud-detection system. Optimize for correctness, reproducibility, security, explainability, and maintainability—not for generating the largest amount of code.

## Source-of-truth order
1. `FinSure_SRS_v2.docx` — formal requirements and acceptance intent.
2. `FinSure_Master_Prompt_FINAL.md` — implementation architecture, ML plan, UI, phases, and engineering rules.
3. Existing source code/tests/docs — preserve working behavior unless a requirement explicitly changes it.
4. Dataset/reference files — use them only for the purposes assigned in the master prompt.

If sources conflict, do not silently choose. Explain the conflict, prefer the safer/correct interpretation, and record the decision.

## Working behavior
- Inspect the repository before editing.
- Do not ask questions unless the answer is genuinely blocking.
- Plan first for complex work; then implement.
- Work phase-by-phase. Do not silently jump to later phases.
- Run relevant tests after meaningful changes.
- Never fabricate metrics, model results, screenshots, API responses, or completed work.
- Keep a short `docs/AGENT_PROGRESS.md` with phase status, commands run, test results, decisions, and next step so a new conversation can resume without rereading the entire chat.
- Prefer small, reversible changes and clear commit-sized units.
- Reuse existing working code before replacing it.
- Never expose secrets or real PII.

## Dataset discipline
- Do NOT load entire large CSVs into chat context.
- Inspect schemas, row counts, dtypes, missingness, label prevalence, and time coverage programmatically.
- Use streaming/chunked reads, sampled profiling, or local scripts for large datasets.
- Keep raw datasets outside Git when appropriate; use `.gitignore`.
- Never alter raw benchmark data. Create processed copies.
- The FinSure synthetic UPI dataset is the primary integrated dataset.
- Public datasets are benchmarks/sanity checks, not automatically pooled into one training table.
- Use time-based splits and leakage checks.
- Record dataset name, source, licence status, hash, row count, fraud rate, purpose, preprocessing version, and split strategy in the data card.

## ML integrity
- No future leakage.
- Fold-safe resampling only.
- Out-of-fold predictions for the meta-learner.
- Primary metric: PR-AUC; also report recall at fixed FPR, precision at fixed recall, F1/F2, calibration/Brier, confusion matrix at chosen threshold, and latency.
- Accuracy must never be the headline metric.
- If the ensemble does not beat a baseline, report that honestly.
- Customer-facing explanations must not expose model internals.

## Security and safety
- Treat payee names, VPAs, notes, and free text as untrusted input.
- FinSure Investigator is read-only and assistive; it never decides fraud or changes case state.
- Validate every generated investigator claim against evidence IDs.
- Hash-chain integrity proves tamper detection of the stored record; do not describe it as proof that the underlying event is factually true.
- Payments are simulated. UPI data is synthetic. Do not connect to live banking/NPCI rails.

## UI
- 3D is purposeful, not decorative.
- Every 3D view must have a 2D/text fallback and respect reduced motion/accessibility.
- Data values shown in 3D must match API/text values.
- Keep forms, tables, settings, evidence, and investigation controls primarily 2D.

## Phase completion
At the end of every phase report:
1. what was built
2. files changed
3. commands/tests run and actual results
4. known limitations
5. proposed next phase

Then stop and wait for `continue`.
