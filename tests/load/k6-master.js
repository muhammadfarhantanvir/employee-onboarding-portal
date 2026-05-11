// tests/load/k6-master.js
import { login } from './helpers/auth.js';
import { Counter } from 'k6/metrics';
import smokeDefault, { options as smokeOptions } from './scenarios/smoke.js';
import loadDefault, { options as loadOptions } from './scenarios/load.js';
import stressDefault, { options as stressOptions } from './scenarios/stress.js';
import spikeDefault, { options as spikeOptions } from './scenarios/spike.js';
import soakDefault, { options as soakOptions } from './scenarios/soak.js';
import volumeDefault, { options as volumeOptions } from './scenarios/volume.js';
import breakpointDefault, { options as breakpointOptions } from './scenarios/breakpoint.js';
import enduranceDefault, { options as enduranceOptions } from './scenarios/endurance.js';

const scenarios = {
  smoke: { fn: smokeDefault, options: smokeOptions },
  load: { fn: loadDefault, options: loadOptions },
  stress: { fn: stressDefault, options: stressOptions },
  spike: { fn: spikeDefault, options: spikeOptions },
  soak: { fn: soakDefault, options: soakOptions },
  volume: { fn: volumeDefault, options: volumeOptions },
  breakpoint: { fn: breakpointDefault, options: breakpointOptions },
  endurance: { fn: enduranceDefault, options: enduranceOptions },
};

const selectedName = __ENV.SCENARIO || 'load';
const selected = scenarios[selectedName];
const scenarioPhase = new Counter('scenario_phase');

if (!selected) {
  throw new Error(`Unknown k6 scenario "${__ENV.SCENARIO}". Valid scenarios: ${Object.keys(scenarios).join(', ')}`);
}

export const options = selected.options;

export function setup() {
  return login();
}

export default function (data) {
  scenarioPhase.add(1, {
    scenario: selectedName,
    phase: __ENV.PHASE || selectedName,
  });
  selected.fn(data);
}
