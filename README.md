# bloop -- discrete-time signals

A discrete-time signal is a sequence of events over time.

Each event in the series has an index, starting at 0. The zero-ith event is immediate, and the first event happens sometimes afterwards, then the second, the third, and so forth.

Each event has some data that goes along with it:
* A timestamp of when it occurs
* An input value (can be anything)
* An output value that is computed from the timestamp, the input value, and any previous data in the timeline

## Usage

```js
// Output when events happen at least 10ms apart
var debounce = bloop.signal({
  filter: (n, state) => state.ts[n] - state.ts[n - 1] > 10
})
// Sum the number of events that occur
var sum = bloop.signal({
  start: 0,
  output: (n, state) => state.output[n - 1] + 1
})
var debounceSum = bloop.compose(debounce, sum)
```

## API

```js
var discreteSignals = require('discrete-signals')
```

## Install

With [npm](https://npmjs.org/) installed, run

```
$ npm install @jayrbolton/bloop
```

## Acknowledgments

## See Also

## License

MIT

