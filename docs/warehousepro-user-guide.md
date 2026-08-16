# WarehousePro User Guide

## Overview

WarehousePro is a GEODIS picker simulation and floor-readiness platform. It lets trainees practice the RF Device workflow, scan Cart/Tote/item barcodes, handle exceptions, and review progress. Supervisors and Leads use the reporting tools to identify coaching needs and track readiness.

The platform is organized around the operational workflow:

1. Build Cart.
2. Start Pick Stage.
3. Travel to Pick Fronts.
4. Verify locations and items.
5. Pick quantities and place items into the correct Tote.
6. Complete Totes and place them on the Putwall.
7. Resolve exceptions.
8. Review performance and floor-readiness status.

## Getting Started

1. Open WarehousePro.
2. Sign in with your GEODIS account.
3. Use the role-specific dashboard or open the Simulator.
4. Select a simulation scenario.
5. Follow the RF Device and warehouse-floor prompts.

The current simulator supports English and Spanish coaching content. The language choice is saved locally for future simulator visits.

## Trainee Workflow

### Open the Simulator

Use the **Simulator** link in the navigation or open `/sim`.

Available scenarios include:

- Zone 1 Beginner, 10 Picks.
- Zone 1 Intermediate, 20 Picks.
- Zone 2 Intermediate, 20 Picks.
- HAZ Advanced, 10 Picks.
- FEX Express, 15 Picks.

Each scenario displays its difficulty, Pick count, Zone, estimated time, and passing score.

### Choose a Device

The simulator supports multiple RF Device presentations. The active device can be changed from the Device Selector before or during a session.

The primary supported device presentation is the SYMBOL WT4000-style RF Device. Other device presentations are available for comparison and training configuration.

### Build Cart

Follow the RF Device prompts and the warehouse-floor cues.

Typical actions include:

1. Travel to the Command Center.
2. Receive direction from the Tasker or CSR.
3. Obtain a Cart and empty Totes.
4. Log into the RF Device.
5. Select BBWD.
6. Select Outbound Phase II.
7. Use `CTRL+T` to change Task Group.
8. Confirm the Task Group.
9. Scan the Zone or FEX barcode.
10. Select Make Tote Cart BB when applicable.
11. Scan the Cart barcode.
12. Place a Tote in the displayed Cart slot.
13. Scan the Tote barcode.
14. Repeat until all 9 Totes are registered.
15. Use `CTRL+E` to finalize the Cart.

The warehouse scene and fallback scan panel show the active Cart or Tote target. If a 3D target is difficult to select, use the active scan target button below the scene.

### Pick Stage

For each Pick:

1. Read the Pick details on the RF Device.
2. Travel to the displayed Pick Front.
3. Verify the physical location against the RF Device ALOC.
4. Verify the item description, SKU, and barcode information.
5. Scan the item UPC.
6. Pick the required quantity.
7. Place the item in the displayed Tote.
8. Enter the quantity placed.
9. Scan the Tote that received the item.
10. Continue to the next Pick.

The current Pick, Zone, error count, and progress are shown in the simulator interface.

### End Of Tote

When the RF Device displays **End Of Tote**:

1. Press `CTRL+A` to confirm the Tote is complete.
2. Carry the completed Tote to the Putwall.
3. Place the Tote on the conveyor.
4. Press Continue when the physical action is complete.

### Beginner Coaching

Beginner coaching provides:

- The action to perform now.
- Why the action matters.
- SOP section reference.
- RF field definitions where useful.
- Visual scan highlights.
- Physical action prompts such as placing a Tote or moving an item.

Intermediate and Advanced scenarios provide less assistance. Advanced scenarios do not use visual target highlighting.

### Spanish Mode

Use the `EN` and `ES` controls in the Simulator header.

Spanish coaching covers the complete current workflow, including:

- Build Cart.
- Pick Stage.
- End Of Tote.
- Putwall handoff.
- Round completion.
- Exception handling.

Some RF Device system text and broader dashboard surfaces may remain in English until the full application localization pass is completed.

## Exceptions

The simulator includes exception paths for common warehouse situations.

### Tote Already Allocated

Set the Tote aside, notify the Lead or Supervisor, and follow the RF Device recovery prompt.

### Pick Cart Already Created

Set the Cart aside, notify the Lead or Supervisor, and restart with another Cart.

### Incorrect Location

Use `CTRL+W`, re-read the ALOC, and verify the physical Pick Front again.

### Incorrect Tote

Use `CTRL+W`, compare the Tote ID on the RF Device with the Cart Tote, and scan the correct Tote.

### Invalid Item

Notify the Lead before continuing. Depending on the scenario, the item may be routed to the Amnesty Bin or Inventory Control after the Tote is taken to the Putwall.

### Short Inventory

Verify the physical location first. Notify the Lead, use the required exception shortcut, and follow the skip/recovery path.

### Damaged Item

Place the damaged item in the Amnesty Bin. Use a ziplock bag first if the item is leaking.

## Results and Scoring

After a simulation completes, the Results screen shows:

- Final score.
- Accuracy score.
- Speed score.
- Pass/fail result.
- Duration.
- Error count.
- Exceptions encountered.
- Exceptions resolved.
- Strengths.
- Recommended improvements.

The score combines accuracy and speed using the scenario's configured weights. The exact passing threshold is scenario-specific.

Session results are saved when the session is complete and the user is authenticated.

## Trainee Dashboard

Open `/dashboard/trainee` or use the role navigation link.

The Trainee Dashboard provides:

- Floor-readiness status.
- Identified readiness gaps.
- Score history.
- Session history.
- Exception coverage.
- Best scenario scores.
- Confirmed Supervisor signoff, if available.
- Replay links for the trainee's own completed sessions.

Trainees can only access their own session and replay data.

## Pick Lead Dashboard

Open `/dashboard/lead`.

The Pick Lead Dashboard provides read-only visibility into assigned trainees:

- Trainee readiness status.
- Best score.
- Completed sessions.
- Last activity.
- Readiness gaps.
- Team exception rates.

### Create a Coaching Flag

1. Select **Flag for Supervisor Review** for an assigned trainee.
2. Review or edit the message.
3. Send the flag.

The flag is stored as a persistent CoachingFlag and assigned to a Supervisor at the trainee's facility.

Pick Leads cannot:

- View unassigned trainees.
- Resolve CoachingFlags.
- Confirm floor-ready status.
- Access Supervisor replay controls.

## Supervisor Dashboard

Open `/dashboard/supervisor`.

The Supervisor Dashboard provides:

- Facility trainee overview.
- Floor-readiness statuses.
- Best scores and completed sessions.
- Exception heatmap.
- 28-day cohort score, accuracy, and pass-rate trend.
- Needs Attention list.
- Coaching Flag queue.
- Supervisor CSV export.

### Open a Coaching Flag

From the Needs Attention list:

1. Select **Open Coaching Flag**.
2. The flag is created with the trainee's primary readiness gap or attention reason.
3. The Supervisor dashboard refreshes and displays the flag in the queue.

### Resolve or Reopen a Coaching Flag

In the Coaching Flags section:

1. Choose **Open** or **Resolved**.
2. Enter resolution notes when resolving or updating a flag.
3. Select **Resolve** to close an open flag.
4. Select **Reopen** if additional coaching is required.

Only Supervisors can resolve or reopen flags, and only within their facility.

### Confirm Floor Ready

From a trainee's Supervisor detail page:

1. Review the readiness status and identified gaps.
2. Review score trend and exception competency.
3. Review session history and replay when needed.
4. Select **Confirm Floor Ready** only when the displayed criteria are met.
5. Add optional Supervisor notes.
6. Submit the confirmation.

The current system does not permit threshold overrides. A signoff requires the configured floor-readiness criteria to be satisfied.

### Export CSV

Select **Export CSV** on the Supervisor Dashboard.

The export includes:

- Employee ID.
- Trainee name.
- Readiness status.
- Confirmed floor-ready status.
- Best score.
- Completed sessions.
- Last activity.
- Days in training.
- Readiness gaps.

The export is facility-scoped and available only to Supervisors.

## Warehouse Manager Dashboard

Open `/dashboard/manager`.

The Warehouse Manager Dashboard provides aggregate facility metrics without individual trainee names:

- Active trainees.
- Average final score over the last 30 days.
- Floor-ready rate.
- Average days to readiness.
- Weekly floor-ready signoffs for the last 8 weeks.
- Exception failure rates for the last 30 days.

The Manager view is intended for operational monitoring and cohort-level planning rather than individual coaching.

## Floor-Readiness Statuses

### In Progress

The trainee is progressing but has not met all floor-readiness criteria.

### Needs Coaching

The trainee has a performance or activity pattern requiring attention, such as declining scores, low exception resolution, or extended inactivity.

### Floor Ready

The trainee has met the configured criteria and can be reviewed for Supervisor confirmation.

Floor Ready status is an eligibility recommendation. The Supervisor signoff remains a separate confirmation action.

## Keyboard Shortcuts

- `CTRL+T`: Change Task Group.
- `CTRL+E`: Finalize Build Cart.
- `CTRL+A`: Confirm End Of Tote.
- `CTRL+W`: Return to the previous screen during exception handling.
- `CTRL+K`: Skip a Pick during an approved exception path.
- `ENTER`: Confirm RF Device input or continue where prompted.

## Troubleshooting

### The 3D target is difficult to select

Use the active scan target button below the warehouse scene. It is the reliable fallback for Cart, Tote, item, and location actions.

### The RF Device does not advance

Check that:

- The correct barcode or value was entered.
- The previous physical confirmation was completed.
- The correct Tote slot is being used.
- The RF Device is waiting for the expected shortcut or input type.

### A scan is rejected

Read the RF Device feedback. Do not repeatedly scan random values. Verify the Cart, Tote, Pick Front, or item against the current instruction.

### A session is not saved

The session must reach completion and the user must be authenticated. If persistence fails, the Results screen reports the save failure. Contact the system administrator with the scenario and approximate completion time.

### Dashboard data appears empty

Dashboard data depends on authenticated access and available database records. Confirm the correct role, facility assignment, and database migration state.

## Current Limitations

- Approved GEODIS content files are still required in the content directories before the content release gate can pass.
- Staging database migrations must be applied with `npm run db:migrate:deploy`.
- Browser and tablet UAT must be completed against authenticated staging access.
- Some dashboard and RF Device text remains English while broader localization continues.
- The simulator uses representative seed data until GEODIS-approved barcode and facility data is supplied.

## Support Checklist

When reporting a problem, include:

- User role.
- Facility.
- Device model.
- Browser and device type.
- URL or dashboard.
- Scenario name.
- Workflow step shown on the RF Device.
- Barcode type involved, without sending sensitive production barcode values unless approved.
- Screenshot or screen recording, if permitted.
- Approximate time of the issue.
