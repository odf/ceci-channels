var core = require('ceci-core');
var cc   = require('../index');

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
