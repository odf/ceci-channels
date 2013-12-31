'use strict';

var core = require('ceci-core');
var cc   = require('../index');


var infiniteRange = function(start) {
  var ch = cc.chan();
  core.go(function*() {
    for (var i = start; ; ++i)
      if (!(yield cc.push(ch, i)))
        break;
  });
  return ch;
};

var numbers = infiniteRange(1);

var channels = 'abc'.split('').map(function(name) {
  var ch = cc.chan();

  core.go(function*() {
    var val;
    while (undefined !== (val = yield cc.pull(numbers))) {
      yield cc.sleep(Math.random() * 25);
      yield cc.push(ch, name + ' ' + val);
    }
  });

  return ch;
});

core.go(function*() {
  var args = channels.concat({ 'default': ' -- ' });
  for (var i = 0; i < 20; ++i) {
    yield cc.sleep(5);
    console.log((yield cc.select.apply(null, args)).value);
  }
  cc.close(numbers);
});
