# Clinical Evidence Base — رسا | RASA

**Purpose:** record the publicly available guidance that informed RASA's clinical
safety boundaries, and state plainly what the app does and does not claim from it.

RASA is a self-recording tool. It implements **general, published safety principles**
— it does not provide personalized medical advice, and nothing in this document is a
treatment recommendation.

---

## 1. Sources actually consulted (MVP)

1. **World Health Organization (2025).** *Update to WHO guidelines on treating
   substance-use disorders: opioid dependence.* — consulted for general principles of
   opioid agonist therapy: regular, adequate dosing under clinical supervision,
   structured treatment plans with scheduled clinical review, and the central role of
   the patient's clinician in any dose decision. RASA mirrors these principles by
   (a) recording prescribed vs actual intake separately, (b) requiring explicit
   clinician authorization for a plan to display as active, and (c) flagging overdue
   reviews rather than acting autonomously.

2. **CMAJ (2024). National clinical practice guideline for opioid use disorder**
   (Canada). PMC11573384. — consulted for the structure of patient-facing safety
   information around missed doses and treatment uncertainty: patients are directed to
   their treating team for dose decisions, and monitoring/recording is framed as a
   shared tool for visits. RASA's neutral missed-dose copy and "record, don't advise"
   stance follow this framing.

3. **British Association for Psychopharmacology consensus guidance on opioid
   substitution treatment (2025/2026).** *Journal of Psychopharmacology.*
   PMC13222391. — consulted for the consensus view that dose adjustments and tapering
   are clinician-supervised processes, and that patient-held records support (but
   never replace) clinical review. RASA's plan/version/review model reflects this.

4. **SAMHSA, TIP 63 (*Medications for Opioid Use Disorder*).** — cited as the widely
   referenced US reference on methadone maintenance. **Access note:** the SAMHSA page
   returned HTTP 403 at the time of writing (automated access restriction), so this
   MVP relied on the three sources above for verifiable text; TIP 63 is listed here
   for completeness and should be re-consulted directly before any clinical expansion
   of the product.

## 2. What RASA claims from the evidence

- That **regular daily dosing and honest self-recording** are part of good MMT care →
  justifies the medication log's planned/actual separation.
- That **dose decisions belong to the treating clinician** → justifies prohibitions
  P1–P3 in `docs/clinical-safety-boundaries.md` and the plan authorization model.
- That **scheduled review of the treatment plan** is standard practice → justifies the
  review-date field, review-lead reminder, and review-overdue flag.

## 3. What RASA does not claim

- No claim about what dose is effective, safe, or appropriate for any individual.
- No claim about equivalence standards beyond the *labelled* strength/concentration
  the user enters (conversion is arithmetic on labelled values only).
- No diagnostic or prognostic capability; symptom scales are recorded for
  conversation with the treatment team, not interpretation.

## 4. Update policy

Before any release that touches clinical copy or thresholds:

1. Re-fetch the sources above (note access failures).
2. Re-review §2–3 and `docs/clinical-safety-boundaries.md`.
3. Bump `clinical-rules@n` if any threshold or boundary changed, with tests.

New sources are added only after being fetched and read — never from memory alone.
