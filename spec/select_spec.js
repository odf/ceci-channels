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


var constructor = { 


var model = function() {
  var _applyCh = function(state, i, cmd, arg) {
    var result   = state[i].channel.apply(state[i].state, cmd, val);
    var newState = state.slice();
    newState[i].state = result.state;
    return {
      state : newState,
      output: result.output
    };
  },

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
    }
  };
};
