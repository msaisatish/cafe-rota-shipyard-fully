# Build plan

Written by Shipyard. Each step has one owning helper (`.claude/agents/`). A step is done when
Shipyard has seen that helper finish and the checks listed for it pass — not when a note says so.
The founder starts each stage with one message (Build everything; later, Get ready to launch).
Work through the stage's steps in that one turn, keeping `.shipyard/plan-progress.json` up to date.

## While building

1. **Design the app and plan how it is built** (id `design`) — owner `ui-designer`. Done when: `ui-designer` seen finishing; check `design_blueprint_present` passes.
2. **The first real feature** (id `phase-1`) — owner `builder`. Done when: `builder` seen finishing; check `typecheck_passes` passes; check `unit_tests_pass` passes; check `style_check_passes` passes; check `pages_load` passes.
3. **The rest of the features** (id `phase-2`) — owner `builder`. Done when: `builder` seen finishing; check `typecheck_passes` passes; check `unit_tests_pass` passes; check `style_check_passes` passes; check `pages_load` passes.
4. **Show it to someone** (id `phase-3`) — owner `builder`. Done when: `builder` seen finishing; check `typecheck_passes` passes; check `unit_tests_pass` passes; check `style_check_passes` passes; check `pages_load` passes.

## Before launch

1. **Write the browser checks for the core flows** (id `tests`) — owner `test-engineer`. Done when: `test-engineer` seen finishing; check `core_flow_smoke_test` passes; check `core_flow_specs_present` passes.
2. **Walk the app in a browser** (id `browser-check`) — owner `browser-qa`. Done when: `browser-qa` seen finishing; check `core_flow_smoke_test` passes; check `core_flow_specs_present` passes.
3. **Security review** (id `security`) — owner `security-reviewer`. Done when: `security-reviewer` seen finishing; check `build_passes` passes.


Something broken at any step goes to the `fixer` helper, then the step's checks run again.
