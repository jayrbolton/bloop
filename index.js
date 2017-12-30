module.exports = {}

module.exports.signal = signal
function signal (config) {
  config.memory = config.memory === undefined ? 1 : config.memory
  return { config: config }
}

// Run a signal -- provide input and output functions
module.exports.run = run
function run (signal, inputFn, outputFn) {
  var state = initState(signal)
  var listeners = []
  function inp (inputVal) {
    var oldN = state.n
    state = process(signal, state, inputVal)
    if (state.n > oldN) {
      listeners.forEach(fn => {
        fn(state.n, state)
      })
    }
  }
  function out (cb) {
    listeners.push(cb)
  }
  outputFn(out)
  inputFn(inp)
  return signal
}

// Combine many signals into one aggregated output
module.exports.combine = combine
function combine (config) {
  // each source signal needs a state
  // on input to the main signal, we need to input to the source signals
  // then take those resulting updater functions and use them to update the main output
  if (!config.hasOwnProperty('sources')) {
    throw new Error('.sources property required')
  }
  if (!config.sources || typeof config.sources !== 'object') {
    throw new Error('.sources should be an object')
  }
  var states = {}
  for (var name in config.sources) {
    states[name] = initState(config.sources[name])
  }
  var newConf = {
    output: (n, state) => {
      var input = state.input[n]
      var accum = state.output[n - 1]
      for (var name in input) {
        var oldN = states[name].n
        states[name] = process(config.sources[name], states[name], input[name])
        if (states[name].n > oldN) {
          var updater = states[name].output[states[name].n]
          if (typeof updater !== 'function') {
            throw new Error('The output of every combined signal should be an updater function')
          }
          accum = updater(accum)
        }
      }
      return accum
    }
  }
  if (config.hasOwnProperty('start')) newConf.start = config.start
  return signal(newConf)
}

// Initialize a start state for a sig
function initState (signal) {
  var state = {
    input: {},
    ts: {},
    output: {},
    n: 0
  }
  if (signal.config.hasOwnProperty('start')) {
    state.output[0] = signal.config.start
    state.ts[0] = Date.now()
  } else {
    state.ts[0] = 0
  }
  return state
}

// process some input value with a state to get a new state
function process (signal, state, input) {
  var newState = Object.assign({}, state)
  var n = state.n + 1
  newState.n = n
  newState.input[n] = input
  newState.ts[n] = Date.now()
  if (typeof signal.config.filter === 'function') {
    // If filter fails, then there are no changes made
    if (!signal.config.filter(n, newState)) return state
  }
  if (typeof signal.config.output === 'function') {
    newState.output[n] = signal.config.output(n, newState)
  } else {
    // Default to the identity func
    newState.output[n] = input
  }
  // delete old values to save memory
  var toDelete = String(n - (signal.config.memory + 1))
  if (newState.input.hasOwnProperty(toDelete)) delete newState.input[toDelete]
  if (newState.ts.hasOwnProperty(toDelete)) delete newState.ts[toDelete]
  if (newState.output.hasOwnProperty(toDelete)) delete newState.output[toDelete]
  return newState
}

// set input for sig1
// run sig1's filter, if present -- if false, bail
// get sig1's output
// set that output as input for sig2
// get sig2's filter if present
// get sig2's output
// set that as the output and the original input as the input
module.exports.compose = compose
function compose (sig1, sig2) {
  var states = {sig1: initState(sig1), sig2: initState(sig2)}
  return signal({
    start: sig2.config.start,
    filter: (n, state) => {
      states.sig1 = process(sig1, states.sig1, state.input[n])
      if (states.sig1.n < n) return false
      states.sig2 = process(sig2, states.sig2, states.sig1.output[n])
      if (states.sig2.n < n) return false
      return true
    },
    output: (n, state) => states.sig2.output[n]
  })
}
