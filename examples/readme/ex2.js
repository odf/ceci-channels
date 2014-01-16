var core = require('ceci-core');
var cc   = require('ceci-channels');

var writeThings = function(ch) {
  core.go(function*() {
    for (var i = 1; ; ++i)
      if (!(yield cc.push(ch, i)))
        break;
  });
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
  console.log(yield run(new cc.Buffer(5)));
  console.log(yield run(new cc.DroppingBuffer(5)));
  console.log(yield run(new cc.SlidingBuffer(5)));
});
