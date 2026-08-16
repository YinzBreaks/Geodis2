# WarehousePro Production Information Request

## Purpose

WarehousePro is a picker training and simulation platform for GEODIS warehouse operations. To move from a validated software build to an accurate production pilot, we need the following information and approved source materials from GEODIS.

The highest priority is operational accuracy: the simulator, coaching, exception paths, and readiness reporting must reflect the actual facility procedure rather than representative assumptions.

## Priority Key

- **Required for pilot:** The pilot should not proceed without this information.
- **Required for realism:** The application can run without it, but training fidelity will be limited.
- **Recommended:** Improves reporting, maintenance, or future rollout.

---

## 1. Approved SOP and Training Content

**Priority: Required for pilot**

Please provide the current, approved versions of:

- `BBWD-WI-030` Pick Process work instruction.
- `BBWD-VJA-030` or the current Build Cart procedure.
- Exception-handling procedures from the applicable SOP section.
- Current training or onboarding instructions used by Taskers, CSRs, Leads, and Supervisors.
- Any facility-specific work instructions that differ from the standard documents.
- Effective dates, revision numbers, owners, and approval status for each document.

For every document, please identify:

- Document number and title.
- Revision/version.
- Effective date.
- Facility or country where it applies.
- Whether the procedure is mandatory or local guidance.
- Sections that are allowed to be reproduced in training content.
- Sections that must remain verbatim and sections that may be simplified for simulation.

### Content approval questions

1. May WarehousePro reproduce SOP wording in coaching, quizzes, directives, and simulation instructions?
2. May GEODIS provide excerpts, or must the application link to an internal document instead?
3. Are screenshots, photographs, product labels, RF screens, and barcode examples approved for use in the application?
4. Who is the final approver for training content and visual assets?

---

## 2. Confirmed Workflow Details

**Priority: Required for pilot**

Please confirm the actual workflow for the pilot facility, including any differences from the current BBWD reference flow.

### Build Cart

- How many totes are normally loaded on a Cart?
- Is the standard always 9 totes?
- Exact sequence for Command Center, Tasker/CSR direction, Cart acquisition, and tote acquisition.
- Exact RF Device menu sequence.
- Whether `CTRL+T`, `CTRL+E`, and Enter behavior matches the current reference.
- Whether `Make Tote Cart BB` applies to this facility.
- Whether any steps differ for US, Canada, or other facility variants.
- What happens when a Cart or Tote is already allocated?

### Pick Stage

- Exact sequence from first RF assignment through completed Pick.
- Whether the picker must scan the item UPC, enter quantity, and scan the Tote in this exact order.
- What happens for partial quantities or short picks.
- Exact End Of Tote behavior and confirmation key.
- Exact Putwall/conveyor handoff sequence.
- When Cart rebuilding or a new Round is required.
- Actual maximum items or capacity rule for a Tote.

### Exceptions

Please confirm the procedure, required actions, and completion condition for each:

- Tote already allocated.
- Pick Cart already created.
- Incorrect Location.
- Incorrect Tote.
- Invalid Item, last item at location.
- Invalid Item, more inventory remains.
- Short Inventory.
- Damaged Item.
- Scan timeout or unreadable barcode, if applicable.
- Any additional facility-specific exceptions.

For each exception, provide:

- Trigger condition.
- Exact first action.
- Required Lead/Supervisor notification.
- Keyboard shortcut or RF action.
- Physical disposition of Tote and item.
- When the exception is considered resolved.
- Whether the event should affect accuracy, speed, or both.

---

## 3. RF Device and Scanner Specifications

**Priority: Required for pilot**

For each device used by pilot trainees, please provide:

- Manufacturer and model.
- Operating system or firmware version, if relevant.
- Screen dimensions and orientation.
- Screen character dimensions for terminal devices.
- Physical keyboard layout.
- Available CTRL keys and soft keys.
- Scan trigger location.
- Whether scanning is performed by imager, laser, camera, or external scanner.
- Supported barcode symbologies.
- Minimum touch-target or physical-key requirements.
- RF screen photos or approved screen recordings for each workflow phase.
- Any device-specific differences between facilities or countries.

Please confirm which device is the production pilot target. The current application contains a WT4000-style primary device model and additional emulator models, but the production target must be confirmed by GEODIS IT.

---

## 4. Barcode and Identifier Formats

**Priority: Required for pilot**

Please provide approved examples and validation rules for:

- Pick Cart barcode.
- Pick Tote barcode.
- Item UPC or product barcode.
- Pick Front/location barcode.
- Zone barcode.
- Task Group barcode.
- FEX/Express barcode.
- User ID or login format, if it is safe to simulate.
- Order number and task identifiers, if visible to the picker.

For each barcode type, provide:

- Example value.
- Prefix and length.
- Allowed characters.
- Barcode symbology.
- Whether check digits are used.
- Whether values are globally unique or facility-specific.
- Whether representative values may be used in training.
- Whether real production barcode data may be stored in the application.

Please explicitly confirm whether the current representative values may remain in the pilot or must be replaced.

---

## 5. Facility and Warehouse Layout Data

**Priority: Required for realism**

For the pilot facility, please provide:

- Facility identifier and timezone.
- Country and language requirements.
- Zones in scope.
- Aisle naming and numbering conventions.
- Pick Front/location format.
- Command Center location.
- Tote supply area.
- Cart staging area.
- Putwall/conveyor locations.
- Amnesty Bin locations.
- IC/Inventory Control locations.
- Any restricted, hazardous, or special-handling zones.
- Approved floor map, blueprint, or simplified layout that may be used in training.

Please identify which layout details can be shown to trainees and which must be omitted for security or operational reasons.

---

## 6. Visual Assets and Photography

**Priority: Required for realism; not required for initial software validation**

If GEODIS provides photographs, please capture or provide:

### RF Device

- Front view with screen visible.
- Keyboard and soft-key bar.
- Scan trigger.
- Device mounted or worn as used during work.
- Typical screen at Build Cart start.
- Typical screen at item Pick.
- End Of Tote screen.
- Error/exception screens.

### Cart and Totes

- Full Cart front, side, and rear views.
- All 9 Tote slots clearly visible.
- Slot numbering and physical labels.
- Tote barcode placement.
- Cart barcode placement.
- Empty Tote and loaded Tote examples.
- Putwall handoff position.

### Shelf and Pick Front

- Full rack or shelf view.
- Location label at readable distance.
- Item labels and UPC placement.
- A correct item example.
- A visually similar or incorrect item example, if approved.
- Different shelf levels used in the pilot.

### Photo requirements

- Use a clean, well-lit area.
- Keep labels and barcodes in focus.
- Photograph the complete object before close-ups.
- Include a ruler or known-size reference where scale matters.
- Do not include employee faces, badges, customer data, or confidential order information unless explicitly approved.
- Provide permission for application use, storage, editing, and deployment.

Preferred formats: PNG, JPG, or WEBP. Original-resolution files are preferred.

---

## 7. Training and Scoring Rules

**Priority: Required for pilot**

Please confirm:

- Definition of a successful Pick.
- Definition of a first-attempt correct scan.
- Whether menu-entry mistakes affect score.
- Whether physical confirmation mistakes affect score.
- Accuracy weighting.
- Speed weighting.
- Target Picks per hour by zone, facility, and order type.
- Pass threshold by difficulty and scenario.
- Maximum permitted errors.
- How injected training exceptions should affect score.
- Whether partial quantity Picks are allowed.
- How no-scan physical actions are measured.
- Whether speed targets differ for FEX, HAZ, or other special workflows.

The current prototype uses accuracy/speed scoring and facility benchmark placeholders. These values must be approved before formal floor-ready certification.

---

## 8. Floor-Ready and Supervisor Signoff Rules

**Priority: Required for pilot**

Please confirm the business rules for floor readiness:

- Required number of completed and passed simulations.
- Minimum latest final score.
- Minimum latest accuracy score.
- Required exception resolution rate.
- Whether all exception types must be encountered.
- Whether an ADVANCED simulation must be passed.
- Whether inactivity or declining performance should create a coaching flag.
- Whether a Supervisor may override any threshold.
- Required signoff notes.
- Required signoff retention period.
- Whether a signoff can be withdrawn or amended.
- Who is authorized to sign off.
- Whether signoff requires more than one Supervisor.

The current pilot policy is no threshold override: the API requires all configured criteria before signoff.

---

## 9. Admin Reporting and Metrics

**Priority: Required for pilot**

Please confirm the definitions and targets for these metrics:

- Active trainee.
- Simulation started.
- Simulation completed.
- Passed simulation.
- Accuracy score.
- Speed score.
- Final score.
- Exception encountered.
- Exception resolved.
- Exception resolution rate.
- Needs Coaching.
- Eligible for floor-ready signoff.
- Confirmed floor-ready.
- Days in training.
- Days to floor-ready.
- Time spent in training.
- Best score.
- Latest score.
- Cohort pass rate.
- Facility readiness rate.

Please provide:

- Required reporting time windows, such as 7, 30, or 90 days.
- Timezone for daily and weekly grouping.
- Rounding rules.
- Treatment of incomplete or abandoned sessions.
- Treatment of duplicate submissions.
- Required CSV columns.
- Required filters.
- Required report recipients.
- Whether reports may contain employee names and IDs.

Aptitude and pre-screening assessment is outside the current WarehousePro scope and should remain a separate process unless GEODIS later requests an integration.

---

## 10. User Roles and Authorization

**Priority: Required for pilot**

Please provide the pilot role list and access rules for:

- Trainee.
- Pick Lead.
- Supervisor.
- Warehouse Manager.
- Any facility administrator or IT support role.

For each role, confirm whether it may:

- View own sessions.
- View assigned trainees.
- View all trainees at a facility.
- View individual session history.
- View replay data.
- Create coaching flags.
- Resolve coaching flags.
- Confirm floor readiness.
- Export CSV reports.
- View cross-facility aggregates.
- Manage users or content.

Please provide the facility-assignment source of truth and how user deactivation should work.

---

## 11. Data Privacy, Retention, and Security

**Priority: Required for pilot approval**

Please confirm:

- Approved employee data fields.
- Whether employee names, IDs, or emails may be stored.
- Whether barcode values may be stored.
- Whether replay events may contain sensitive operational data.
- Required retention period for session events.
- Required retention period for reports.
- Required retention period for signoffs and audit records.
- Deletion or anonymization requirements.
- Data residency requirements.
- Approved hosting region.
- Security review or penetration-test requirements.
- Required SSO or identity provider integration.
- Incident-reporting contact and response expectations.

The current planning target is two years of retention, subject to GEODIS approval.

---

## 12. Production Pilot Operations

**Priority: Required for pilot**

Please identify:

- Pilot facility.
- Pilot start date.
- Pilot duration.
- Pilot trainee count.
- Pilot Supervisors and Pick Leads.
- GEODIS product owner.
- GEODIS IT contact.
- Operations/SOP approver.
- Data protection/security contact.
- Support escalation contact.
- Pilot success metrics.
- Daily/weekly review cadence.
- Go/no-go decision owners.

Please also confirm the staging environment and provide:

- Staging database connection process.
- Test user accounts or SSO procedure.
- Test facility/role assignments.
- Migration approval process.
- Backup and restore procedure.
- Approved browser and tablet models.
- Network restrictions and offline expectations.

---

## 13. Minimum Package Needed to Start the Pilot

The following package is the minimum production input set:

- Approved current SOP documents and revision metadata.
- Confirmed pilot workflow and exception paths.
- Confirmed production RF Device model.
- Approved barcode formats and representative test values.
- Pilot facility zones and location conventions.
- Confirmed scoring and floor-ready thresholds.
- Role/access matrix.
- Data retention and privacy approval.
- Approved visual/photo usage rights.
- Named GEODIS content, operations, IT, and security owners.
- Staging access for migration verification.
- At least one approved lab, simulation, question bank, and directive package for validation.

## Suggested Response Format

Please return this document with:

- Answers in the relevant sections.
- Links or attachments for source documents.
- Revision/effective dates.
- `Approved`, `Needs clarification`, or `Not applicable` beside each item.
- Owner and due date for unresolved items.

## Important Boundary

WarehousePro currently contains representative seed data and prototype content maps. Representative values must not be treated as confirmed GEODIS production data until GEODIS Operations and IT explicitly approve them.
