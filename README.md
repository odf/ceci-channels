ceci-channels
=============

Ceci is a Javascript library inspired by [Go](http://golang.org/)'s channels and goroutines and by [Clojure](http://clojure.org/)'s [core.async](https://github.com/clojure/core.async/). It depends on ES6 generators and requires a preprocessor to run under Javascript engines that do not yet support those. An easy way to use Ceci directly right now is under NodeJS 0.11.x with the `--harmony` option.

Ceci-channels builds upon the functionality in [ceci-core](https://github.com/odf/ceci-core), which forms the bottom layer of the library. Ceci-core provides go blocks and deferred values, which together let one integrate asynchronous, non-blocking calls into code as if they were blocking. On top of these base abstractions, ceci-channels adds blocking channels with various buffering options as the primary communication mechanism between go blocks. It also provides an adapter for NodeJS streams and a few utilities around timeouts.

Here is a simple example of channels in action:
```javascript
var core = require('ceci-core');
var cc   = require('ceci-channels');

var ch = cc.chan();

core.go(function*() {
  for (var i = 1; i <= 10; ++i)
    yield cc.push(ch, i);
  cc.close(ch);
});

core.go(function*() {
  var val;
  while (undefined !== (val = yield cc.pull(ch)))
    console.log(val);
});
```

Unsurprisingly, this prints out the numbers 1 to 10, each on a line by itself.

We first create a channel by calling the function `chan()`. We then run two go blocks, one that writes (pushes) values onto the channel, and another that reads (pulls) from it. The functions `push()` and `pull()` both return deferred values and are usually used in combination with a `yield`. In this example, the channel is unbuffered, which means that a push onto it will block until there is a corresponding pull and vice versa. A channel always produces values in the same order as they were written to it, so in effect, it acts as a blocking queue.

The `close()` function closes a channel immediately, which means that all pending operations on it will be cancelled and no further data can be pushed. Pulls from a buffered channel are still possible until its buffer is exhausted. In our example, the channel is unbuffered, so there are no further values to be pulled. This is signalled to the second go block by returning the value `undefined` on the next call to `pull()`.

Let's now investigate some buffering options for channels. We start by defining a function that writes numbers onto a provided channel:

```javascript
var core = require('ceci-core');
var cc   = require('ceci-channels');

var writeThings = function(ch) {
  core.go(function*() {
    for (var i = 1; ; ++i)
      if (!(yield cc.push(ch, i)))
        break;
  });
};
```

This looks quite similar to the code above, but this time, instead of pushing a fixed number of values, we use the eventual return value of the `push()` call to determine whether the output channel is still open. Here's the function that will consume the data:

```javascript
var readThings = function(ch) {
  return core.go(function*() {
    var a = [];
    var i;
    for (i = 0; i < 10; ++i) {
      yield cc.sleep(1);
      a.push(yield cc.pull(ch));
    }
    cc.close(ch);
    return a;
  });
};
```

This function reads ten values from the provided channel and eventually returns an array with these values. But before each read, it pauses for a millisecond by calling the `sleep()` function. This means that data will be produced faster than it can be consumed. Let's see how this plays out with different kinds of buffering:

```javascript
var run = function(buffer) {
  var ch = cc.chan(buffer);

  writeThings(ch);
  return readThings(ch);
};

core.go(function*() {
  console.log(yield run());
  console.log(yield run(new cc.Buffer(5)));
  console.log(yield run(new cc.DroppingBuffer(5)));
  console.log(yield run(new cc.SlidingBuffer(5)));
});
```

The function `run()` creates a channel with the specified buffer (or an unbuffered one if no argument was given) and runs first `readThings()` and then `writeThings()` on it, returning the (deferred) result of the latter. The final go block simply executes `run` with various buffers and prints out the results. The output looks something like this:

```
[ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]
[ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]
[ 1, 2, 3, 4, 5, 20, 58, 62, 130, 221 ]
[ 53, 167, 259, 423, 563, 761, 957, 1156, 1209, 1363 ]
```

Ceci provides three types of buffer, all of fixed size, which differ only in how they handle a push operation when full. A `Buffer` will block the push until a slot becomes available due to a subsequent pull. A `DroppingBuffer` will accept the push, but drop the new value. A `SlidingBuffer` will accept the push and buffer the new value, but drop the oldest value it holds in order to make room.

In the next example, we simulate a simple worker pool. Let's first define a function that starts a worker on a channel of jobs and returns a fresh channel with that worker's output:

```javascript
var core = require('ceci-core');
var cc   = require('ceci-channels');

var startWorker = function(jobs, name) {
  var results = cc.chan();

  core.go(function*() {
    var val;
    while (undefined !== (val = yield cc.pull(jobs))) {
      yield cc.sleep(Math.random() * 40);
      yield cc.push(results, name + ' ' + val);
    }
  });

  return results;
};
```

While jobs are available, the worker pulls a new one from the channel, works on it for some time (simulated by the `sleep` call) and pushes the result onto its own output channel. Let's now create a channel with an infinite supply of jobs and a few workers to take care of them:

```javascript
var jobs = cc.chan();
core.go(function*() {
  for (var i = 1; ; ++i)
    if (!(yield cc.push(jobs, i)))
      break;
});

var a = startWorker(jobs, 'a');
var b = startWorker(jobs, 'b');
var c = startWorker(jobs, 'c');
```

How can we collect and display the results in the order the are produced? Channels in Ceci are first class objects that can be passed around and shared between go blocks, as demonstrated by the `jobs` channel. So one simple way would be for the workers to also write results to a common output channel. But we might not have ownership of the worker code, so instead we could write a function that merges the incoming results into a new channel:

```javascript
var merge = function() {
  var inchs = Array.prototype.slice.call(arguments);
  var outch = cc.chan();

  inchs.forEach(function(ch) {
    core.go(function*() {
      var val;
      while (undefined !== (val = yield cc.pull(ch)))
        if (!(yield cc.push(outch, val)))
          break;
    });
  });

  return outch;
};
```

We start to see a useful pattern emerge here that is taken further in upcoming Ceci components: functions take one or more channels as input and create a fresh channel (or sometimes several channels) for their output. This approach is highly composable and allows one to build an infinite variety of processing pipelines on top of the channel abstraction. Using the `merge`, we can now collect all worker outputs and print them:

```javascript
var outputs = merge(a, b, c);

core.go(function*() {
  for (var i = 0; i < 10; ++i)
    console.log(yield cc.pull(outputs));
  cc.close(jobs);
});
```

Due to the randomisation, the output will be a little different every time. It looks something like this:

```
a 1
c 3
a 4
b 2
c 5
a 6
b 7
b 10
c 8
a 9
```

An alternative to the merge approach is the `select()` function, which takes a number of channels as arguments and returns a result of the form `{ channel: ..., value: ... }`, where `channel` is the first channel it can pull from, and `value` is the associated value. We can use this in our example as follows:

```javascript
core.go(function*() {
  for (var i = 0; i < 10; ++i)
    console.log((yield cc.select(a, b, c)).value);
  cc.close(jobs);
});
```

One of the advantages of `select()` is that it also supports non-blocking channel operations by specifying a default value:

```javascript
core.go(function*() {
  for (var i = 0; i < 10; ++i) {
    yield cc.sleep(5);
    console.log((yield cc.select(a, b, c, { default: '...' })).value);
  }
  cc.close(jobs);
});
```

The output now looks more like this:

```
...
b 2
b 4
...
c 3
a 1
b 5
c 6
...
...
```

As the following, somewhat contrived example shows, `select()` can handle push operations just as well as pulls:

```javascript
var d = cc.chan();

core.go(function*() {
  for (var i = 0; i < 10; ++i) {
    yield cc.sleep(5);
    var res = yield cc.select([d, 'x'], a, b, c, { default: '...' });
    if (res.channel != d)
      console.log(res.value);
  }
  cc.close(jobs);
  cc.close(d);
});

core.go(function*() {
  var count = 0;
  while (undefined !== (yield cc.pull(d))) {
    yield cc.sleep(20);
    ++count;
  }
  console.log('pushed to d ' + count + ' times');
});
```

This produces the following sort of output:

```
...
b 2
a 1
c 3
b 4
c 6
...
pushed to d 3 times
```

License
-------

Copyright (c) 2013 Olaf Delgado-Friedrichs.

Distributed under the MIT license.
