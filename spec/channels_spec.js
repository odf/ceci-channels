'use strict';

var G = require('./generative');


describe('a simple predicate testing for positivity', function() {
  var pred = function(n) {
    return (n > 0) ? G.success() : G.failure('must be positive');
  };

  describe('applied a natural number generator', function() {
    var gen = function(n) {
      return G.randomInt(1, Math.max(1, n));
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


describe('a stack', function() {
  var stack = {
    _data: [],

    push: function(x) {
      return this._data.push(x);
    },

    pop: function() {
      if (this._data.length == 0)
        throw new Error('stack is empty');
      else
        return this._data.pop();
    },
    
    empty: function() {
      return this._data.length == 0;
    },

    reset: function() {
      this._data = [];
    },

    apply: function(command, args) {
      return this[command].apply(this, args);
    }
  };
});
