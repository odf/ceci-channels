'use strict';

var fs   = require('fs');
var core = require('ceci-core');
var cc   = require('ceci-channels');


var content = function(path) {
  return core.nbind(fs.readFile, fs)(path, { encoding: 'utf8' });
};


var readLines = function(path) {
  var ch = cc.chan();

  core.go(function*() {
    var lines = (yield content(path)).split('\n');

    for (var i = 0; i < lines.length; ++i)
      yield cc.push(ch, lines[i]);

    cc.close(ch);
  });

  return ch;
};


core.go(function*() {
  var ch = readLines(process.argv[2]);
  var line, i;

  for (i = 1; (line = yield cc.pull(ch)) !== undefined; ++i)
    console.log((i % 5 == 0 ? i : '') + '\t' + line);
});
