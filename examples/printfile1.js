'use strict';

var fs = require('fs');
var core = require('ceci-core');


var content = function(path) {
  var result = core.defer();

  fs.readFile(path, { encoding: 'utf8' }, function(err, val) {
    if (err)
      result.reject(new Error(err));
    else
      result.resolve(val);
  });

  return result;
};


var readLines = function(path) {
  return core.go(function*() {
    return (yield content(path)).split('\n');
  });
};


core.go(function*() {
  var lines = yield readLines(process.argv[2]);

  for (var i = 1; i <= lines.length; ++i)
    console.log((i % 5 == 0 ? i : '') + '\t' + lines[i-1]);
});
