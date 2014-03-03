'use strict';

require('comfychair/jasmine');
var comfy = require('comfychair');

describe('a simple predicate testing for positivity', function() {
  var pred = function(n) {
    return (n > 0) ? comfy.success() : comfy.failure('must be positive');
  };

  describe('applied a natural number generator', function() {
    var gen = function(n) {
      return comfy.randomInt(1, Math.max(1, n));
    };

    var shrink = function(n) {
      return (n > 1) ? [n-1] : [];
    };

    it('succeeds', function() {
      expect(pred).toSucceedOn(gen, shrink);
      expect(pred).toSucceedOn(gen);
    });
  });
});
