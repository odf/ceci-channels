'use strict';

var core = require('ceci-core');
var cc   = require('../lib/index');


core.go(function*() {
  var ticker = cc.ticker(500);

  for (var i = 0; i < 10; ++i) {
    yield cc.pull(ticker);
    console.log(i);
  }
  ticker.close();
});
