module.exports = {}

// - figure out flat-mapping -- make a source data callback function?
//   - how to do a single signal that goes [click -> loading -> ajax -> response -> done]

module.exports.signal = signal
function signal (config) {
  if (!config.output || typeof config.output !== 'function') throw new Error('pass in a .output output function')
  config.memory = config.memory === undefined ? 1 : config.memory
  return { config: config }
}

// Run a signal -- provide input and output functions
module.exports.run = run
function run (signal, inputFn, outputFn) {
  var state = createState(signal)
  var nth = 0 // Nth event
  var listeners = []
  function inp (inputVal) {
    nth += 1
    var outputVal = setState(nth, inputVal, state, signal)
    listeners.forEach(fn => fn(outputVal))
  }
  function out (cb) {
    listeners.push(cb)
  }
  outputFn(out)
  inputFn(inp)
  return signal
}

function createState (sig) {
  return {
    input: {},
    ts: {0: Date.now()},
    output: {0: sig.config.base}
  }
}

function setState (nth, inputVal, state, signal) {
  var toDelete = String(nth - (signal.config.memory + 1))
  state.input[nth] = inputVal
  state.ts[nth] = Date.now()
  if (state.input.hasOwnProperty(toDelete)) delete state.input[toDelete]
  if (state.ts.hasOwnProperty(toDelete)) delete state.ts[toDelete]
  state.output[nth] = signal.config.output(nth, state)
  state.last = nth
  if (state.output.hasOwnProperty(toDelete)) delete state.output[toDelete]
  return state.output[nth]
}

// Combine many signals into one aggregated output
module.exports.combine = combine
function combine (config) {
  // each source signal needs a state
  // on input to the main signal, we need to input to the source signals
  // then take those resulting updater functions and use them to update the main output
  if (!config.hasOwnProperty('sources')) throw new Error('.sources property required')
  if (!config.sources || typeof config.sources !== 'object') throw new Error('.sources should be an object')
  var states = {}
  for (var name in config.sources) {
    states[name] = createState(config.sources[name])
  }
  return signal({
    base: config.base,
    output: (n, state) => {
      var input = state.input[n]
      var accum = state.output[n - 1]
      for (var name in input) {
        var updater = setState(n, state.input[n], states[name], config.sources[name])
        if (typeof updater !== 'function') throw new Error('invalid input updater; should be a function')
        accum = updater(accum)
      }
      return accum
    }
  })
}

module.exports.compose = compose
function compose (sig1, sig2) {
  var states = {sig1: createState(sig1), sig2: createState(sig2)}
  return signal({
    base: sig2.base,
    output: (n, state) => {
      var out = setState(n, state.input[n], states.sig1, sig1)
      return setState(n, out, states.sig2, sig2)
    }
  })
}
