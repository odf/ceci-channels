'use strict';

var G = require('./generative');


describe('a simple predicate testing for positivity', function() {
  var pred = function(n) {
    return (n > 0) ? G.success() : G.failure('must be positive');
  };

  var shrink = function(n) {
    return (n > 1) ? [n-1] : [];
  };

  describe('applied a natural number generator', function() {
    var gen = function(n) {
      return G.randomInt(1, Math.max(1, n));
    };

    it('succeeds', function() {
      expect(G.checkPredicate(pred, gen, shrink)).toSucceed();
    });
  });
});
