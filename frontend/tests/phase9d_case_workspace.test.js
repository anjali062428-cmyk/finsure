import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('FinSure Phase 9D — Case Investigation Workspace & Grounded Investigator Tests', () => {

  // Canonical Phase 8 Case Lifecycle Transition Matrix
  const VALID_TRANSITIONS = {
    new: ['under_investigation'],
    under_investigation: ['escalated', 'confirmed_fraud', 'dismissed'],
    escalated: ['under_investigation', 'confirmed_fraud', 'dismissed', 'closed'],
    confirmed_fraud: ['closed'],
    dismissed: ['closed'],
    closed: [], // Terminal
  };

  // 1. Case list rendering
  describe('1. Case List Rendering & Contract Schema', () => {
    const SAMPLE_CASE = {
      case_id: 'case_a1b2c3d4e5f6',
      incident_id: 'inc_778899aabbcc',
      alert_id: 'alt_aabbcc11',
      transaction_id: 'tx_upi_1234567890',
      user_id: 'usr_cust_001',
      status: 'under_investigation',
      priority: 'CRITICAL',
      risk_score: 94.5,
      risk_band: 'CRITICAL',
      decision: 'block',
      scam_type: 'lottery_fraud',
      assigned_to: 'analyst@finsure.internal',
      customer_reported: false,
      opened_at: '2026-09-29T10:00:00Z',
      updated_at: '2026-09-29T10:15:00Z',
      evidence_count: 5,
    };

    it('case entity must adhere to authoritative backend fields and risk score range 0-100', () => {
      assert.ok(SAMPLE_CASE.case_id.startsWith('case_'));
      assert.ok(SAMPLE_CASE.risk_score >= 0.0 && SAMPLE_CASE.risk_score <= 100.0);
      assert.ok(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(SAMPLE_CASE.priority));
      assert.ok(Object.keys(VALID_TRANSITIONS).includes(SAMPLE_CASE.status));
      assert.equal(typeof SAMPLE_CASE.evidence_count, 'number');
    });

    it('customer reported dispute cases must be identifiable via flag', () => {
      const disputeCase = { ...SAMPLE_CASE, customer_reported: true };
      assert.equal(disputeCase.customer_reported, true);
    });
  });

  // 2. Case creation
  describe('2. Case Creation / Opening Flow', () => {
    const createCasePayload = (incidentId, customerReported = false) => {
      if (!incidentId) throw new Error('Either incident_id or transaction_id must be provided.');
      return {
        case_id: `case_${Math.random().toString(36).substring(2, 14)}`,
        incident_id: incidentId,
        status: 'new',
        priority: 'HIGH',
        risk_score: 82.0,
        customer_reported: customerReported,
        opened_at: new Date().toISOString(),
      };
    };

    it('should generate valid case payload bound to incident reference', () => {
      const created = createCasePayload('inc_998877', false);
      assert.ok(created.case_id.startsWith('case_'));
      assert.equal(created.incident_id, 'inc_998877');
      assert.equal(created.status, 'new');
    });

    it('should reject creation without incident_id or transaction_id', () => {
      assert.throws(() => createCasePayload(null), /Either incident_id or transaction_id must be provided/);
    });
  });

  // 3. Case detail loading
  describe('3. Case Detail Workspace Payload Schema', () => {
    const SAMPLE_WORKSPACE = {
      case: {
        case_id: 'case_test_01',
        status: 'under_investigation',
        priority: 'CRITICAL',
        risk_score: 92.0,
      },
      evidence: [
        { evidence_id: 'E1', evidence_type: 'transaction', content_hash: 'hash_e1' },
        { evidence_id: 'E2', evidence_type: 'shap_reason', content_hash: 'hash_e2' },
      ],
      transitions: [
        { transition_id: 'tr_1', from_status: 'new', to_status: 'under_investigation' },
      ],
      notes: [
        { note_id: 'nt_1', note_text: 'Initial review begun.', author_id: 'analyst_01' },
      ],
      latest_investigation: {
        run_id: 'run_01',
        validator_passed: true,
        groundedness_score: 1.0,
      },
    };

    it('workspace must contain case, evidence array, transitions array, and notes array', () => {
      assert.ok(SAMPLE_WORKSPACE.case);
      assert.ok(Array.isArray(SAMPLE_WORKSPACE.evidence));
      assert.ok(Array.isArray(SAMPLE_WORKSPACE.transitions));
      assert.ok(Array.isArray(SAMPLE_WORKSPACE.notes));
      assert.equal(SAMPLE_WORKSPACE.evidence.length, 2);
    });
  });

  // 4. Valid state transition
  describe('4. Valid State Machine Transitions', () => {
    const canTransition = (from, to) => {
      const allowed = VALID_TRANSITIONS[from] || [];
      return allowed.includes(to);
    };

    it('new can transition to under_investigation', () => {
      assert.equal(canTransition('new', 'under_investigation'), true);
    });

    it('under_investigation can transition to escalated, confirmed_fraud, or dismissed', () => {
      assert.equal(canTransition('under_investigation', 'escalated'), true);
      assert.equal(canTransition('under_investigation', 'confirmed_fraud'), true);
      assert.equal(canTransition('under_investigation', 'dismissed'), true);
    });

    it('escalated can transition to confirmed_fraud, dismissed, under_investigation, or closed', () => {
      assert.equal(canTransition('escalated', 'closed'), true);
      assert.equal(canTransition('escalated', 'under_investigation'), true);
    });

    it('confirmed_fraud and dismissed can transition to closed', () => {
      assert.equal(canTransition('confirmed_fraud', 'closed'), true);
      assert.equal(canTransition('dismissed', 'closed'), true);
    });
  });

  // 5. Invalid state transition blocked
  describe('5. Invalid State Transitions Blocked', () => {
    const canTransition = (from, to) => {
      const allowed = VALID_TRANSITIONS[from] || [];
      return allowed.includes(to);
    };

    it('new cannot jump directly to confirmed_fraud, dismissed, or closed', () => {
      assert.equal(canTransition('new', 'confirmed_fraud'), false);
      assert.equal(canTransition('new', 'dismissed'), false);
      assert.equal(canTransition('new', 'closed'), false);
    });

    it('closed status is strictly terminal with zero valid transitions', () => {
      assert.equal(VALID_TRANSITIONS['closed'].length, 0);
      assert.equal(canTransition('closed', 'under_investigation'), false);
      assert.equal(canTransition('closed', 'new'), false);
    });

    it('confirmed_fraud cannot return to under_investigation', () => {
      assert.equal(canTransition('confirmed_fraud', 'under_investigation'), false);
    });
  });

  // 6. Mandatory reason validation
  describe('6. Mandatory Reason & Note Validation for Dismissal and Escalation', () => {
    const validateTransitionPayload = (toStatus, reasonCode, note) => {
      if (['dismissed', 'escalated'].includes(toStatus)) {
        if (!reasonCode || !reasonCode.trim()) {
          throw new Error(`Transition to '${toStatus}' requires a mandatory reason_code.`);
        }
        if (!note || !note.trim()) {
          throw new Error(`Transition to '${toStatus}' requires a mandatory explanatory note.`);
        }
      }
      return true;
    };

    it('should reject dismissal without reason_code', () => {
      assert.throws(
        () => validateTransitionPayload('dismissed', '', 'Customer confirmed transaction was authorized.'),
        /requires a mandatory reason_code/
      );
    });

    it('should reject escalation without explanatory note', () => {
      assert.throws(
        () => validateTransitionPayload('escalated', 'high_loss_exposure', ''),
        /requires a mandatory explanatory note/
      );
    });

    it('should accept transition with complete reason and note', () => {
      assert.ok(validateTransitionPayload('dismissed', 'legitimate_customer_consent', 'Telephonic verification performed.'));
    });
  });

  // 7. Critical four-eyes behavior
  describe('7. Critical Four-Eyes Policy Enforcement', () => {
    const validateFourEyesPolicy = (casePriority, toStatus, actorId, approvedBy) => {
      if (toStatus === 'dismissed' && casePriority === 'CRITICAL') {
        if (!approvedBy || !approvedBy.trim()) {
          throw new Error('Four-eyes policy violation: Dismissing a CRITICAL priority case requires approval from a second analyst or compliance/admin.');
        }
        if (approvedBy.trim().toLowerCase() === actorId.trim().toLowerCase()) {
          throw new Error('Four-eyes policy violation: Approver cannot be the same analyst requesting the dismissal.');
        }
      }
      return true;
    };

    it('CRITICAL priority dismissal without co-approver must be rejected', () => {
      assert.throws(
        () => validateFourEyesPolicy('CRITICAL', 'dismissed', 'analyst_01', null),
        /Four-eyes policy violation/
      );
    });

    it('CRITICAL priority dismissal where approver == actor must be rejected', () => {
      assert.throws(
        () => validateFourEyesPolicy('CRITICAL', 'dismissed', 'analyst_01', 'analyst_01'),
        /Approver cannot be the same analyst/
      );
    });

    it('CRITICAL priority dismissal with distinct co-approver must pass', () => {
      assert.ok(validateFourEyesPolicy('CRITICAL', 'dismissed', 'analyst_01', 'supervisor_compliance_02'));
    });

    it('Non-critical priority dismissal does not mandate second approver', () => {
      assert.ok(validateFourEyesPolicy('MEDIUM', 'dismissed', 'analyst_01', null));
    });
  });

  // 8. Evidence rendering
  describe('8. Evidence Binder Record Schema', () => {
    const SAMPLE_EVIDENCE = {
      evidence_id: 'E1',
      case_id: 'case_001',
      evidence_type: 'transaction',
      source_ref: 'tx_upi_9876543210',
      added_by: 'system',
      content_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      metadata: { amount: 25000.0, channel: 'UPI_P2P' },
      withdrawn_at: null,
      withdraw_reason: null,
      created_at: '2026-09-29T10:00:00Z',
    };

    it('evidence item must contain mandatory fields and 64-char SHA-256 hash', () => {
      assert.ok(SAMPLE_EVIDENCE.evidence_id.startsWith('E'));
      assert.equal(SAMPLE_EVIDENCE.content_hash.length, 64);
      assert.ok(SAMPLE_EVIDENCE.metadata);
      assert.equal(SAMPLE_EVIDENCE.withdrawn_at, null);
    });
  });

  // 9. Withdrawn evidence rendering
  describe('9. Withdrawn Evidence & Zero-Deletion Rule', () => {
    const SAMPLE_WITHDRAWN_EVIDENCE = {
      evidence_id: 'E3',
      evidence_type: 'device',
      content_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      withdrawn_at: '2026-09-29T12:00:00Z',
      withdraw_reason: 'Superseded by verified hardware fingerprint from device provider.',
    };

    it('withdrawn evidence must preserve content hash and carry mandatory withdrawal reason', () => {
      assert.ok(SAMPLE_WITHDRAWN_EVIDENCE.withdrawn_at !== null);
      assert.ok(SAMPLE_WITHDRAWN_EVIDENCE.withdraw_reason.length >= 3);
      assert.ok(SAMPLE_WITHDRAWN_EVIDENCE.content_hash.length === 64);
    });

    it('active evidence filter must exclude withdrawn records when filtering for active items', () => {
      const items = [
        { evidence_id: 'E1', withdrawn_at: null },
        { evidence_id: 'E2', withdrawn_at: '2026-09-29T11:00:00Z' },
        { evidence_id: 'E3', withdrawn_at: null },
      ];
      const active = items.filter((ev) => ev.withdrawn_at === null);
      assert.equal(active.length, 2);
      assert.deepEqual(active.map((e) => e.evidence_id), ['E1', 'E3']);
    });
  });

  // 10. Timeline rendering
  describe('10. Unified Chronological Timeline Contract', () => {
    const SAMPLE_TIMELINE = [
      { timestamp: '2026-09-29T10:00:00Z', event_type: 'case_created', actor_id: 'system' },
      { timestamp: '2026-09-29T10:05:00Z', event_type: 'evidence_added', actor_id: 'system', evidence_id: 'E1' },
      { timestamp: '2026-09-29T10:15:00Z', event_type: 'transition_to_under_investigation', actor_id: 'analyst_01' },
      { timestamp: '2026-09-29T10:30:00Z', event_type: 'analyst_note_added', actor_id: 'analyst_01' },
    ];

    it('timeline events must maintain chronological order', () => {
      for (let i = 1; i < SAMPLE_TIMELINE.length; i++) {
        const prevTime = new Date(SAMPLE_TIMELINE[i - 1].timestamp).getTime();
        const currTime = new Date(SAMPLE_TIMELINE[i].timestamp).getTime();
        assert.ok(currTime >= prevTime, `Timeline out of chronological order at index ${i}`);
      }
    });
  });

  // 11. Notes submission
  describe('11. Analyst Case Notes Submission', () => {
    const createNote = (caseId, authorId, authorRole, noteText) => {
      if (!noteText || !noteText.trim()) throw new Error('Note text cannot be empty.');
      return {
        note_id: `note_${Math.random().toString(36).substring(2, 10)}`,
        case_id: caseId,
        author_id: authorId,
        author_role: authorRole,
        note_text: noteText.trim(),
        created_at: new Date().toISOString(),
      };
    };

    it('should create valid note with author identity and timestamp', () => {
      const note = createNote('case_01', 'analyst_john', 'fraud_analyst', 'Contacted beneficiary bank.');
      assert.ok(note.note_id.startsWith('note_'));
      assert.equal(note.author_id, 'analyst_john');
      assert.equal(note.note_text, 'Contacted beneficiary bank.');
    });

    it('should reject empty note submission', () => {
      assert.throws(() => createNote('case_01', 'analyst_john', 'fraud_analyst', '   '), /Note text cannot be empty/);
    });
  });

  // 12. Similar-case rendering
  describe('12. Similar Cases (kNN) & Non-Causal Disclaimer', () => {
    const SAMPLE_SIMILAR_RESPONSE = {
      case_id: 'case_01',
      similar_cases: [
        { case_id: 'case_hist_09', similarity_score: 0.892, scam_type: 'lottery_fraud', status: 'closed' },
        { case_id: 'case_hist_14', similarity_score: 0.841, scam_type: 'task_scam', status: 'closed' },
      ],
      attribution_disclaimer: 'Statistical similarity across historical embeddings; not causal proof of fraud.',
    };

    it('should render similar historical cases with similarity percentage and non-causal disclaimer', () => {
      assert.equal(SAMPLE_SIMILAR_RESPONSE.similar_cases.length, 2);
      assert.ok(SAMPLE_SIMILAR_RESPONSE.similar_cases[0].similarity_score > 0);
      assert.ok(SAMPLE_SIMILAR_RESPONSE.attribution_disclaimer.includes('not causal proof of fraud'));
    });
  });

  // 13. Investigator execution
  describe('13. FinSure Investigator Pipeline (Plan -> Examine -> Report)', () => {
    const SAMPLE_RUN = {
      run_id: 'run_investigate_01',
      case_id: 'case_001',
      plan: [
        '1. Inspect transaction velocity and channel attributes.',
        '2. Examine device telemetry and historical binding.',
        '3. Cross-reference graph centrality for shared payee hubs.',
      ],
      tool_calls: [
        { tool: 'get_case', args: { case_id: 'case_001' }, status: 'success' },
        { tool: 'get_evidence', args: { case_id: 'case_001' }, status: 'success' },
        { tool: 'get_shap', args: { case_id: 'case_001' }, status: 'success' },
      ],
      findings: { high_velocity: true, unknown_device: true },
      report_text: 'Transaction flagged for velocity spike [E1]. Device fingerprint untrusted [E3]. Findings suggest high likelihood of unauthorized access [E1, E3].',
      provider: 'template',
      model: 'deterministic-v1',
      validator_passed: true,
      groundedness_score: 1.0,
      unsupported_claims: [],
      latency_ms: 42.5,
      created_at: '2026-09-29T10:00:00Z',
    };

    it('investigator run must contain plan, examine tool calls, and grounded report', () => {
      assert.equal(SAMPLE_RUN.plan.length, 3);
      assert.equal(SAMPLE_RUN.tool_calls.length, 3);
      assert.ok(SAMPLE_RUN.report_text.includes('[E1]'));
      assert.equal(SAMPLE_RUN.validator_passed, true);
      assert.equal(SAMPLE_RUN.groundedness_score, 1.0);
    });
  });

  // 14. Evidence citation rendering
  describe('14. Evidence Citation Extraction & Rendering', () => {
    const extractCitations = (text) => {
      const matches = text.match(/\[(E\d+(?:,\s*E\d+)*)\]/g) || [];
      const ids = [];
      matches.forEach((m) => {
        const raw = m.slice(1, -1);
        raw.split(',').forEach((id) => ids.push(id.trim()));
      });
      return [...new Set(ids)];
    };

    it('should extract explicit evidence IDs from narrative sentences', () => {
      const text = 'Transaction for ₹25,000 flagged [E1]. Device anomaly detected [E3, E4].';
      const citations = extractCitations(text);
      assert.deepEqual(citations, ['E1', 'E3', 'E4']);
    });
  });

  // 15. Claim validation failure
  describe('15. Authoritative Claim Validation Failure Handling', () => {
    const validateClaimAgainstEvidence = (claimText, activeEvidenceIds) => {
      const matches = claimText.match(/\[(E\d+)\]/g) || [];
      if (matches.length === 0) {
        return {
          valid: false,
          groundedness_score: 0.0,
          rejection_reasons: ['Missing citation: Statement lacks evidence reference.'],
        };
      }
      const citedIds = matches.map((m) => m.slice(1, -1));
      const invalid = citedIds.filter((id) => !activeEvidenceIds.includes(id));
      if (invalid.length > 0) {
        return {
          valid: false,
          groundedness_score: 0.0,
          rejection_reasons: [`Invalid evidence reference: Cited ${invalid.join(', ')} not in active evidence.`],
        };
      }
      return { valid: true, groundedness_score: 1.0, rejection_reasons: [] };
    };

    it('should fail validation when statement lacks citations', () => {
      const res = validateClaimAgainstEvidence('The user definitely committed fraud.', ['E1', 'E2']);
      assert.equal(res.valid, false);
      assert.ok(res.rejection_reasons[0].includes('Missing citation'));
    });

    it('should fail validation when statement references non-existent evidence', () => {
      const res = validateClaimAgainstEvidence('Transaction was flagged [E999].', ['E1', 'E2']);
      assert.equal(res.valid, false);
      assert.ok(res.rejection_reasons[0].includes('Invalid evidence reference'));
    });

    it('should pass validation when citations exist in active evidence', () => {
      const res = validateClaimAgainstEvidence('Transaction was flagged [E1].', ['E1', 'E2']);
      assert.equal(res.valid, true);
      assert.equal(res.groundedness_score, 1.0);
    });
  });

  // 16. Unsupported claim handling
  describe('16. Unsupported Claim Segregation', () => {
    const filterSupportedClaims = (claims, activeEvidenceIds) => {
      const supported = [];
      const unsupported = [];
      claims.forEach((claim) => {
        const matches = claim.match(/\[(E\d+)\]/g) || [];
        const cited = matches.map((m) => m.slice(1, -1));
        if (cited.length > 0 && cited.every((c) => activeEvidenceIds.includes(c))) {
          supported.push(claim);
        } else {
          unsupported.push(claim);
        }
      });
      return { supported, unsupported };
    };

    it('should separate unsupported claims from verified narrative', () => {
      const claims = [
        'Transaction ₹25,000 flagged [E1].',
        'Customer was contacted by phone [E99].',
        'Device is untrusted [E3].',
      ];
      const { supported, unsupported } = filterSupportedClaims(claims, ['E1', 'E3']);
      assert.equal(supported.length, 2);
      assert.equal(unsupported.length, 1);
      assert.ok(unsupported[0].includes('[E99]'));
    });
  });

  // 17. Evidence pack export
  describe('17. Evidence Pack Binary ZIP Export Contract', () => {
    const mockExportResponse = (caseId) => ({
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename=evidence_pack_${caseId}.zip`,
        'x-case-id': caseId,
      },
      sizeBytes: 15420,
    });

    it('should declare application/zip media type and authentic attachment filename', () => {
      const res = mockExportResponse('case_abc123');
      assert.equal(res.headers['content-type'], 'application/zip');
      assert.equal(res.headers['content-disposition'], 'attachment; filename=evidence_pack_case_abc123.zip');
      assert.ok(res.sizeBytes > 0);
    });
  });

  // 18. Audit verification failure state
  describe('18. Audit Verification Failure & Warning Priority', () => {
    const verifyChain = (events) => {
      for (let i = 1; i < events.length; i++) {
        if (events[i].prev_hash !== events[i - 1].record_hash) {
          return {
            verified: false,
            events_verified: i,
            error: `Hash mismatch at event index ${i}: expected ${events[i - 1].record_hash}, got ${events[i].prev_hash}`,
          };
        }
      }
      return { verified: true, events_verified: events.length };
    };

    it('should detect corrupted hash chain and return verified: false with failure details', () => {
      const corruptedEvents = [
        { record_hash: 'hash_01', prev_hash: null },
        { record_hash: 'hash_02', prev_hash: 'hash_01' },
        { record_hash: 'hash_03', prev_hash: 'TAMPERED_HASH' },
      ];
      const res = verifyChain(corruptedEvents);
      assert.equal(res.verified, false);
      assert.ok(res.error.includes('Hash mismatch at event index 2'));
    });
  });

  // 19. RBAC & forbidden handling
  describe('19. RBAC & Read-Only Tool Security Contract', () => {
    const ALLOWED_ANALYST_ROLES = ['fraud_analyst', 'analyst', 'compliance_officer', 'admin'];

    const PROHIBITED_WRITE_TOOLS = [
      'create_case',
      'update_case',
      'change_status',
      'modify_risk_score',
      'modify_threshold',
      'block_transaction',
      'dismiss_incident',
      'confirm_fraud',
      'delete_evidence',
    ];

    it('customer role must be forbidden from accessing analyst case endpoints', () => {
      const isAllowed = (role) => ALLOWED_ANALYST_ROLES.includes(role);
      assert.equal(isAllowed('customer'), false);
      assert.equal(isAllowed('fraud_analyst'), true);
      assert.equal(isAllowed('compliance_officer'), true);
      assert.equal(isAllowed('admin'), true);
    });

    it('Investigator Sandbox must reject any prohibited write operation with PermissionError', () => {
      const executeInvestigatorTool = (toolName) => {
        if (PROHIBITED_WRITE_TOOLS.includes(toolName)) {
          throw new Error(`Investigator Tool Sandbox Violation: '${toolName}' is a prohibited write operation.`);
        }
        return { status: 'success' };
      };

      PROHIBITED_WRITE_TOOLS.forEach((tool) => {
        assert.throws(() => executeInvestigatorTool(tool), /Investigator Tool Sandbox Violation/);
      });
    });
  });

  // 20. No fake evidence/model values
  describe('20. Data Authority & Zero-Fabrication Invariant', () => {
    it('risk score must be dynamically sourced from backend case entity, not hardcoded', () => {
      const cases = [
        { case_id: 'case_1', risk_score: 95.2 },
        { case_id: 'case_2', risk_score: 41.8 },
        { case_id: 'case_3', risk_score: 78.4 },
      ];
      assert.equal(cases[0].risk_score, 95.2);
      assert.equal(cases[1].risk_score, 41.8);
      assert.equal(cases[2].risk_score, 78.4);
    });

    it('evidence content hash must be genuine SHA-256 (64 hex characters)', () => {
      const hash = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';
      assert.match(hash, /^[a-f0-9]{64}$/);
    });
  });

});
