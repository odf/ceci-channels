'use strict';

var fs   = require('fs');
var core = require('ceci-core');
var cc   = require('../index');


var content = function(path) {
  return cc.bind(fs.readFile, fs)(path, { encoding: 'utf8' });
};


var toChannel = function(array) {
  var ch = cc.chan();

  array.forEach(cc.push.bind(null, ch));
  cc.close(ch);

  return ch;
};


var readLines = function(path) {
  return core.go(function*() {
    return toChannel((yield content(path)).split('\n'));
  });
};


core.go(function*() {
  var ch = yield readLines(process.argv[2]);
  var line, i;

  for (i = 1; (line = yield cc.pull(ch)) !== undefined; ++i)
    console.log((i % 5 == 0 ? i : '') + '\t' + line);
});
