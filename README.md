ceci-channels
=============

Ceci is a Javascript library inspired by [Go](http://golang.org/)'s channels and goroutines and by [Clojure](http://clojure.org/)'s [core.async](https://github.com/clojure/core.async/). It depends on ES6 generators and requires a preprocessor to run under Javascript engines that do not yet support those. An easy way to use Ceci directly right now is under NodeJS 0.11.x with the `--harmony` option.

Ceci-channels builds upon the functionality in [ceci-core](https://github.com/odf/ceci-core), which forms the bottom layer of the library. Ceci-core provides go blocks and deferred values, which together let one integrate asynchronous, non-blocking calls into code as if they were blocking. On top of these base abstractions, ceci-channels adds blocking channels with various buffering options as the primary communication mechanism between go blocks. It also provides a small number of utilities such as timeouts and tickers, a channel adapter for NodeJS streams, and wrapping mechanisms for function calls that conform to Node's callback conventions.

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

We first create a channel by calling the function `chan()`. We then run two go blocks, one that writes (pushes) values onto the channel, and another that reads (pulls) from it. The functions `push()` and `pull()` both return deferred values and are normally used in combination with a `yield`. In this example, the channel has no buffer, which means that a push onto it will block until there is a corresponding pull and vice versa. A channel always produces values in the same order as they were written to it, so in effect, it acts as a blocking queue.

The `close()` function closes a channel immediately, which means that no further pushes onto it will be accepted. It may still be possible to pull from the channel if it has a non-empty buffer or if there are pending pushes onto it. We will get to these situations in detail a bit further on. In our example, the `close()` call happens after the last push has completed, and there are no more values to be pulled. This is signalled to the second go block by returning the value `undefined` on the next call to `pull()`.

License
-------

Copyright (c) 2013 Olaf Delgado-Friedrichs.

Distributed under the MIT license.
