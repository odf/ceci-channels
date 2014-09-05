'use strict';

require('comfychair/jasmine');
var comfy = require('comfychair');
var cbuf = require('ceci-buffers');
var chan = require('../index');
var channelSpec = require('./channel_spec');


var randomIntList = function(minLen, maxLen, minVal, maxVal) {
  var n = comfy.randomInt(minLen, maxLen);
  var result = [];
  for (var i = 0; i < n; ++i)
    result.push(comfy.randomInt(minVal, maxVal));
  return result;
};


var model = function() {
  var _tryCh = function(state, i, cmd, arg) {
    return state[i].channel.apply(state[i].state, cmd, val);
  };

  var _applyCh = function(state, i, cmd, arg) {
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
    close: function(state, i, val) {
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
      if (defaultVal !== undefined) {
        return {
          state : state,
          output: [['*', defaultVal]]
        };
      }
    }
  };

  return {
    commands: function() {
      var cmds = Object.keys(_transitions).slice();
      cmds.splice(cmds.indexOf('init'), 1);
      return cmds;
    },
    randomArgs: function(command, size) {
      return _genArgs(command)(size);
    },

    shrinkArgs: function(command, args) {
      return _shrinkArgs(command)(args);
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
