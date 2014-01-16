'use strict';

var core = require('ceci-core');
var cc   = require('ceci-channels');


// This go block will throw an exception, because push requires a value other
// than undefined.

core.go(function*() {
  yield cc.push(cc.chan());
});
