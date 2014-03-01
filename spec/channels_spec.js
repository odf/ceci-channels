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
      this._data.push(x);
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

  describe('described by an appropriate model', function() {
    var model = {
      commands: function() {
        return ['push', 'pop', 'empty'];
      },

      randomArgs: function(command, size) {
        if (command == 'push')
          return [G.randomInt(0, size)];
        else
          return [];
      },

      initial: function() {
        return [];
      },

      apply: function(state, command, args) {
        switch(command) {
        case 'push':
          return {
            state: state.concat(args[0])
          }
        case 'pop':
          if (state.length == 0)
            return {
              state : state,
              thrown: new Error('stack is empty').message
            }
          else
            return {
              state : state.slice(0, state.length-1),
              output: state[state.length-1]
            }
        case 'empty':
          return {
            state : state,
            output: state.length == 0
          }
        }
      }
    };

    it('passes the conformity test', function() {
      expect(stack).toConformTo(model);
    });
  });
});
