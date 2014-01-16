'use strict';

var core = require('ceci-core');
var cc   = require('ceci-channels');

var source = cc.chan();
var mc = cc.multicast(source);


var chatter = function(i) {
  var ch = cc.chan();

  core.go(function*() {
    var val;
    while (undefined !== (val = yield cc.pull(ch)))
      console.log('' + i + ': ' + val);
  });

  return ch;
};


core.go(function*() {
  var channels = [];
  var ch, i;

  for (i = 1; i < 6; ++i) {
    ch = chatter(i);
    channels.push(ch);

    yield cc.tap(mc, ch);
    yield cc.push(source, i);
    console.log();
  }

  for (i = 1; i < 6; ++i) {
    ch = channels.shift();

    yield cc.untap(mc, ch);
    yield cc.push(source, -i);
    console.log();

    cc.close(ch);
  }

  cc.close(source);
});
