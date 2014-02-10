'use strict';

var core = require('ceci-core');
var cc   = require('ceci-channels');

var quote = function(s) {
  return "-- " + s.replace(/\n$/, '') + " --";
};

core.go(function*() {
  var count = 0;

  console.log('Type up to five lines, which I shall echo.');
  process.stdin.setEncoding('utf8');

  var ch = cc.fromStream(process.stdin)

  cc.each(
    function(text) {
      console.log(quote(text));
      if (++count >= 5) {
        console.log('My work here is done. Press Enter to finish.');
        cc.close(ch);
      }
    },
    ch);
});
