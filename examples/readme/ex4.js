var core = require('ceci-core');
var cc   = require('../index');

var startWorker = function(jobs, name) {
  var results = cc.chan();

  core.go(function*() {
    var val;
    while (undefined !== (val = yield cc.pull(jobs))) {
      yield core.sleep(Math.random() * 40);
      yield cc.push(results, name + ' ' + val);
    }
  });

  return results;
};

var jobs = cc.chan();
core.go(function*() {
  for (var i = 1; ; ++i)
    if (!(yield cc.push(jobs, i)))
      break;
});

var a = startWorker(jobs, 'a');
var b = startWorker(jobs, 'b');
var c = startWorker(jobs, 'c');

core.go(function*() {
  for (var i = 0; i < 10; ++i)
    console.log((yield cc.select(a, b, c)).value);
  cc.close(jobs);
});
