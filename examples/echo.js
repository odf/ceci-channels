'use strict';

var core = require('ceci-core');
var cc   = require('../index');

var quote = function(s) {
  return "-- " + s.replace(/\n$/, '') + " --";
};

core.go(function*() {
  var ch, text;

  process.stdin.setEncoding('utf8');
  ch = cc.fromStream(process.stdin);

  for (;;) {
    text = yield cc.pull(ch);
    if (text === undefined)
      break;
    else
      console.log(quote(text));
  }
});
