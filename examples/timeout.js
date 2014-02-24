'use strict';

var core = require('ceci-core');
var cc   = require('../lib/index');


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


var ms = parseInt(process.argv[2] || "5");
var ch = infiniteRange(1);

core.go(function*() {
  var i, t, val;

  console.log('Taking the first 10 numbers:');

  for (i = 0; i < 10; ++i)
    console.log(yield cc.pull(ch));

  console.log();
  console.log('Taking further numbers for ' + ms + ' miliseconds:');

  t = cc.timeout(ms);
  while (undefined !== (val = (yield cc.select(t, ch)).value))
    console.log(val);

  console.log();
  console.log('Taking 10 more numbers:');

  for (i = 0; i < 10; ++i)
    console.log(yield cc.pull(ch));

  ch.close();
});
