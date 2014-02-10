'use strict';

var core = require('ceci-core');
var cb   = require('ceci-buffers');
var cc   = require('../index');

var source = function*(start) {
  for (var i = 1; ; ++i)
    yield(i);
};

var writeThings = function(ch) {
  cc.fromGenerator(source(1), ch);
};

var readThings = function(ch) {
  return core.go(function*() {
    var a = [];
    var i;
    for (i = 0; i < 10; ++i) {
      yield core.sleep(1);
      a.push(yield cc.pull(ch));
    }
    cc.close(ch);
    return a;
  });
};

var run = function(buffer) {
  var ch = cc.chan(buffer);

  writeThings(ch);
  return readThings(ch);
};

core.go(function*() {
  console.log(yield run());
  console.log(yield run(new cb.Buffer(5)));
  console.log(yield run(new cb.DroppingBuffer(5)));
  console.log(yield run(new cb.SlidingBuffer(5)));
});
