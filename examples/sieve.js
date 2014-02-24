// Concurrent prime sieve, loosely based on http://golang.org/doc/play/sieve.go

'use strict';

var core = require('ceci-core');
var cc   = require("../lib/index");


var infiniteRange = function(start) {
  var outputs = cc.chan();

  core.go(function*() {
    var i, ok;

    for (i = start; ; ++i) {
      ok = yield cc.push(outputs, i);
      if (!ok)
        break;
    }
  });

  return outputs;
};


var nonMultiples = function(inputs, prime) {
  var outputs = cc.chan();

  core.go(function*() {
    var n, ok;

    for (;;) {
      n = yield cc.pull(inputs);
      if (n % prime != 0) {
        ok = yield cc.push(outputs, n);
        if (!ok)
          break;
      }
    }
    cc.close(inputs);
  });

  return outputs;
};


var sieve = function() {
  var numbers = infiniteRange(2);
  var primes  = cc.chan();

  core.go(function*() {
    var ch = numbers;
    var p, ok;

    for (;;) {
      p = yield cc.pull(ch);
      ok = yield cc.push(primes, p);
      if (!ok)
        break;
      ch = nonMultiples(ch, p);
    }

    cc.close(ch);
  });

  return primes;
};


var n = parseInt(process.argv[2] || "50");
var start = parseInt(process.argv[3] || "2");

core.go(function*() {
  var primes = sieve();
  var p = 0;
  var i;

  while (p < start)
    p = yield(cc.pull(primes));

  for (i = 0; i < n; ++i) {
    console.log(p);
    p = yield(cc.pull(primes));
  }
  cc.close(primes);
});
