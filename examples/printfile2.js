'use strict';

var fs   = require('fs');
var core = require('ceci-core');
var cc   = require('../lib/index');


var content = function(path) {
  return core.nbind(fs.readFile, fs)(path, { encoding: 'utf8' });
};


var toChannel = function(array) {
  var ch = cc.chan();

  core.go(function*() {
    for (var i = 0; i < array.length; ++i)
      yield cc.push(ch, array[i]);
    cc.close(ch);
  });

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
