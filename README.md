ceci-channels
=============

Ceci is a Javascript library inspired by [Go](http://golang.org/)'s channels and goroutines and by [Clojure](http://clojure.org/)'s [core.async](https://github.com/clojure/core.async/). It depends on ES6 generators and requires a preprocessor to run under Javascript engines that do not yet support those. An easy way to use Ceci directly right now is under NodeJS 0.11.x with the `--harmony` option.

Ceci-channels builds upon the functionality in [ceci-core](https://github.com/odf/ceci-core), which forms the bottom layer of the library. Ceci-core provides go blocks and deferred values, which together let one integrate asynchronous, non-blocking calls into code as if they were blocking. On top of these base abstractions, ceci-channels adds blocking channels with various buffering options as the primary communication mechanism between go blocks. It also provides a small number of utilities such as timeouts and tickers, a channel adapter for NodeJS streams, and wrapping mechanisms for function calls that conform to Node's callback conventions.

License
-------

Copyright (c) 2013 Olaf Delgado-Friedrichs.

Distributed under the MIT license.
