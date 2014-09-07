'use strict';

require('comfychair/jasmine');
var comfy = require('comfychair');
var cbuf = require('ceci-buffers');
var chan = require('../index');
var channelSpec = require('./channel_spec');


var randomList = function(minLen, maxLen, randomElement) {
  var n = comfy.randomInt(minLen, maxLen);
  var result = [];
  for (var i = 0; i < n; ++i)
    result.push(randomElement);
  return result;
};


var shrinkList = function(list, elementShrinker) {
  var result = [];
  var n = list.length;
  var i, head, tail;

  for (i = 0; i < n; ++i)
    result.push([].concat(list.slice(0, i), list.slice(i+1)));

  for (i = 0; i < n; ++i) {
    head = list.slice(0, i);
    tail = list.slice(i+1);
    elementShrinker(list[i]).forEach(function(x) {
      result.push([].concat(head, [x], tail));
    });
  }

  return result;
};


var model = function() {
  var _tryCh = function(state, i, cmd, arg) {
    i = i % state.length;
    return state[i].channel.apply(state[i].state, cmd, val);
  };

  var _applyCh = function(state, i, cmd, arg) {
    i = i % state.length;
    var result   = _tryCh(state, i, cmd, arg);
    var newState = state.slice();
    newState[i].state = result.state;
    return {
      state : newState,
      output: result.output
    };
  };

  var _transitions = {
    init: function(state, sizes, types) {
      return {
        state: sizes.map(function(_, i) {
          var channel = channelSpec.model(types[i]);
          var state = channel.apply(null, 'init', sizes[i]);
          return {
            channel: channel,
            state  : state
          };
        });
      };
    },
    push: function(state, i, val) {
      return _applyCh(state, i, 'push', val);
    },
    pull: function(state, i) {
      return _applyCh(state, i, 'pull');
    },
    close: function(state, i) {
      return _applyCh(state, i, 'close');
    },
    select: function(state, chans, vals, defaultVal) {
      for (var i = 0; i < chans.length; ++i) {
        var ch  = chans[i];
        var val = vals[i];
        var cmd = val < 0 ? 'pull' : 'push';
        var res = _tryCh(state, ch, cmd, val);

        if (res.output.length > 0) {
          var newState = _applyCh(state, ch, cmd, val);
          newState.output = newState.output.concat([['*']]);
          return newState;
        }
      }
      if (defaultVal < 0) {
        return {
          state : state,
          output: [['*', defaultVal]]
        };
      }
    }
  };

  var _genArgs = {
    init: function(size) {
      var k = Math.sqrt(size);
      var n = comfy.randomInt(0, k);
      var sizes = [];
      var types = [];
      for (var i = 0; i < n; ++i) {
        sizes.push(comfy.randomInt(0, k));
        types.push(comfy.randomInt(0, 3));
      }
      return [sizes, types];
    },
    push: function(size) {
      return [comfy.randomInt(0, size), comfy.randomInt(Math.sqrt(size))];
    },
    pull: function(size) {
      return [comfy.randomInt(0, size)];
    },
    close: function(size) {
      return [comfy.randomInt(0, size)];
    },
    select: function(size) {
      var s = Math.floor(Math.sqrt(size) / 2);
      var n = comfy.randomInt(0, k);
      var chans = [];
      var vals = [];
      for (var i = 0; i < n; ++i) {
        chans.push(comfy.randomInt(0, size));
        vals.push(comfy.randomInt(-k, k));
      }
      var defaultVal = comfy.randomInt(-k, k);
      return [chans, vals, defaultVal];
    }
  };

  var _shrinkArgs = {
    init: function(args) {
    },
    push: function(args) {
    },
    pull: function(args) {
    },
    close: function(args) {
    },
    select: function(args) {
    }
  };

  return {
    commands: function() {
      var cmds = Object.keys(_transitions).slice();
      cmds.splice(cmds.indexOf('init'), 1);
      return cmds;
    },

    randomArgs: function(command, size) {
      return _genArgs[command](size);
    },

    shrinkArgs: function(command, args) {
      return _shrinkArgs[command](args);
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
