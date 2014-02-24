'use strict';

var core = require('ceci-core');
var cc   = require('../lib/index');


// This go block will throw an exception, because push requires a value other
// than undefined.

core.go(function*() {
  yield cc.push(cc.chan());
}).then(null, function(ex) { console.log(ex.stack); });
