var test = require('tape')
var bloop = require('..')

test('debounce example', t => {
  // Output when events happen at least 10ms apart
  var debounce = bloop.signal({
    filter: (n, state) => state.ts[n] - state.ts[n - 1] > 10
  })
  // Sum of inputs
  var sum = bloop.signal({
    start: 0,
    output: (n, state) => state.output[n - 1] + 1
  })
  var debounceSum = bloop.compose(debounce, sum)
  var accum = []

  bloop.run(debounceSum,
    function (input) {
      input('a')
      setTimeout(function () {
        input('b')
        input('b')
        setTimeout(function () {
          input('c')
          input('c')
          setTimeout(function () {
            input('d')
            input('d')
            t.deepEqual(accum, [1, 2, 3, 4])
            t.end()
          }, 20)
        }, 20)
      }, 20)
    },
    function (output) {
      output(function (n, state) {
        accum.push(state.output[n])
      })
    }
  )
})

test('aggregation example', t => {
  var incr = bloop.signal({
    output: () => { return (n) => n + 1 }
  })
  var decr = bloop.signal({
    output: () => { return (n) => n - 1 }
  })
  var reset = bloop.signal({
    output: () => { return () => 0 }
  })
  var sum = bloop.combine({
    start: 0,
    sources: {incr, decr, reset}
  })
  var accum = []
  bloop.run(sum,
    function (input) {
      input({incr: true})
      input({incr: true})
      input({decr: true})
      input({reset: true})
      t.deepEqual(accum, [1, 2, 1, 0])
      t.end()
    },
    function (output) {
      output(function (n, state) {
        accum.push(state.output[n])
      })
    }
  )
})
