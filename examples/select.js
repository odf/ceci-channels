'use strict';

var core = require('ceci-core');
var cc   = require('../lib/index');


var async = function(gen) {
  core.top(core.go(gen));
};


var infiniteRange = function(start) {
  var ch = cc.chan();
  async(function*() {
    for (var i = start; ; ++i)
      if (!(yield cc.push(ch, i)))
        break;
  });
  return ch;
};

var numbers = infiniteRange(1);

var channels = 'abc'.split('').map(function(name) {
  var ch = cc.chan();

  async(function*() {
    var val;
    while (undefined !== (val = yield cc.pull(numbers))) {
      yield core.sleep(Math.random() * 25);
      yield cc.push(ch, name + ' ' + val);
    }
  });

  return ch;
});

async(function*() {
  var args = channels.concat(null, { 'default': ' -- ' });
  for (var i = 0; i < 20; ++i) {
    yield core.sleep(5);
    console.log((yield cc.select.apply(null, args)).value);
  }
  cc.close(numbers);
});
