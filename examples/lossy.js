'use strict';

var core = require('ceci-core');
var cc   = require('../index');

var run = function(buffer) {
  var ch = cc.chan(buffer);

  core.go(function*() {
    for (var i = 1; ; ++i)
      if (!(yield cc.push(ch, i)))
        break;
  });

  return core.go(function*() {
    var i;
    for (i = 0; i < 20; ++i) {
      yield cc.pull(cc.timeout(0));
      console.log(yield cc.pull(ch));
    }
    cc.close(ch);
    return;
  });
};

core.go(function*() {
  yield run(new cc.Buffer(0));
  console.log();
  yield run(new cc.Buffer(5));
  console.log();
  yield run(new cc.DroppingBuffer(5));
  console.log();
  run(new cc.SlidingBuffer(5));
});
