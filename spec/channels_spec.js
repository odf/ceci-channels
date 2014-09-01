'use strict';

require('comfychair/jasmine');
var comfy = require('comfychair');
var chan = require('../index');


var merge = function() {
  var args = Array.prototype.slice.call(arguments);
  var result = args.every(Array.isArray) ? [] : {};
  var i, obj, key;
  for (i in args) {
    obj = args[i];
    for (key in obj)
      result[key] = obj[key];
  }
  return result;
};


var model = function() {
  var _transitions = {
    init: function(state, arg) {
      return {
        state: {
          count  : 0,
          buffer : [],
          bsize  : arg,
          pullers: [],
          pushers: [],
          closed : false
        }
      };
    },
    push: function(state, val) {
      var h = state.count + 1;
      state = merge(state, { count: h });

      if (state.closed) {
        return {
          state : state,
          output: [[h, false]]
        };
      } else if (state.pullers.length > 0) {
        return {
          state : merge(state, { pullers: state.pullers.slice(1) }),
          output: [[state.pullers[0], val], [h, true]]
        };
      } else if (state.bsize > state.buffer.length) {
        return {
          state : merge(state, { buffer: state.buffer.concat([val]) }),
          output: [[h, true]]
        };
      } else {
        return {
          state : merge(state, { pushers: state.pushers.concat([[h, val]]) }),
          output: []
        };
      }
    },
    pull: function(state) {
      var h = state.count + 1;
      state = merge(state, { count: h });

      if (state.buffer.length > 0) {
        if (state.pushers.length > 0) {
          return {
            state: merge(state, {
              buffer : state.buffer.slice(1).concat(state.pushers[0][1]),
              pushers: state.pushers.slice(1)
            }),
            output: [[state.pushers[0][0], true], [h, state.buffer[0]]]
          };
        } else {
          return {
            state: merge(state, {
              buffer: state.buffer.slice(1)
            }),
            output: [[h, state.buffer[0]]]
          };
        }
      } else if (state.closed) {
        return {
          state : state,
          output: [[h, undefined]]
        };
      } else if (state.pushers.length > 0) {
        return {
          state : merge(state, { pushers: state.pushers.slice(1) }),
          output: [[state.pushers[0][0], true], [h, state.pushers[0][1]]]
        };
      } else {
        return {
          state : merge(state, { pullers: state.pullers.concat([h]) }),
          output: []
        };
      }
    },
    close: function(state) {
      return {
        state: merge(state, {
          pullers: [],
          pushers: [],
          closed : true
        }),
        output: [].concat(
          state.pushers.map(function(p) { return [p[0], false]; }),
          state.pullers.map(function(p) { return [p, undefined]; }))
      };
    }
  };

  var _hasArgument = function(command) {
    return ['init', 'push'].indexOf(command) >= 0;
  };

  return {
    commands: function() {
      var cmds = Object.keys(_transitions).slice();
      cmds.splice(cmds.indexOf('init'), 1);
      return cmds;
    },
    randomArgs: function(command, size) {
      if (_hasArgument(command))
        return [comfy.randomInt(0, size)];
      else
        return [];
    },

    shrinkArgs: function(command, args) {
      if (_hasArgument(command) && args[0] > 0)
        return [[args[0] - 1]];
      else
        return [];
    },

    apply: function(state, command, args) {
      var result =_transitions[command].apply(null, [state].concat(args));
      return {
        state : result.state,
        output: JSON.stringify(result.output)
      };
    }
  };
};


var handler = function(buffer, n) {
  var _isResolved = false;

  return {
    resolve: function(val) {
      _isResolved = true;
      buffer.push([n, val]);
    },
    reject: function(err) {
      _isResolved = true;
      buffer.push([n, err]);
    },
    isResolved: function() {
      return _isResolved;
    }
  };
};


var implementation = function() {
  return {
    apply: function(command, args) {
      if (command == 'init') {
        this._buffer = [];
        this._count = 0;
        this._channel = chan.chan(args[0]);
      } else {
        this._buffer.splice(0, this._buffer.length);
        if (command != 'close')
          this._count += 1;

        var h = handler(this._buffer, this._count);
        if (command == 'push')
          this._channel.requestPush(args[0], h);
        else if (command == 'pull')
          this._channel.requestPull(h);
        else
          this._channel.close();

        return JSON.stringify(this._buffer);
      }
    }
  };
};


describe('a channel', function() {
  it('conforms to the channel model', function() {
    expect(implementation()).toConformTo(model());
  });
});
