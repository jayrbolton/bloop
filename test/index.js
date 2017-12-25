var test = require('tape')
var {combine, run, compose, signal} = require('..')

test('debounce example', t => {
  // Output true when events happen at least 100ms apart
  var debounce = signal({
    base: false,
    output: (n, state) => state.ts[n] - state.ts[n - 1] > 100
  })
  // Sum of inputs
  var sum = signal({
    base: 0,
    output: (n, state) => state.output[n - 1] + Number(state.input[n])
  })
  var debounceSum = compose(debounce, sum)

  run(debounceSum,
    function (input) {
      input('a')
      setTimeout(function () {
        input('b')
        input('c')
        setTimeout(function () {
          input('d')
          input('e')
          setTimeout(function () {
            input('f')
            input('g')
            t.end()
          }, 1000)
        }, 1000)
      }, 1000)
    },
    function (output) {
      output(function (val) {
        console.log('got output!', val)
      })
    }
  )
})

test('aggregation example', t => {
  var incr = signal({
    output: () => { return (n) => n + 1 }
  })
  var decr = signal({
    output: () => { return (n) => n - 1 }
  })
  var reset = signal({
    output: () => { return () => 0 }
  })
  var sum = combine({
    base: 0,
    sources: {incr, decr, reset}
  })
  run(sum,
    function (input) {
      input({incr: true})
      input({incr: true})
      input({decr: true})
      input({reset: true})
      t.end()
    },
    function (output) {
      output(function (val) {
        console.log('got output', val)
      })
    }
  )
})
