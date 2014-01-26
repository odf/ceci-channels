'use strict';

var core = require('ceci-core');
var cc   = require('ceci-channels');

var quote = function(s) {
  return "-- " + s.replace(/\n$/, '') + " --";
};

core.go(function*() {
  process.stdin.setEncoding('utf8');

  cc.each(
    function(text) {
      console.log(quote(text));
    },
    cc.fromStream(process.stdin)
  );
});
