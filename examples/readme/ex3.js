var core = require('ceci-core');
var cc   = require('ceci-channels');

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

var merge = function() {
  var inchs = Array.prototype.slice.call(arguments);
  var outch = cc.chan();

  inchs.forEach(function(ch) {
    core.go(function*() {
      var val;
      while (undefined !== (val = yield cc.pull(ch)))
        if (!(yield cc.push(outch, val)))
          break;
    });
  });

  return outch;
};

var outputs = merge(a, b, c);

core.go(function*() {
  for (var i = 0; i < 10; ++i)
    console.log(yield cc.pull(outputs));
  cc.close(jobs);
});
