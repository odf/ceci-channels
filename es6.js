'use strict';

var extend = function(obj, other) {
  var p;
  for (p in other)
    obj[p] = other[p];
};

extend(exports, require('./src/channels'));
extend(exports, require('./src/multicast'));
extend(exports, require('./src/util'));
