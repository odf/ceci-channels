'use strict';

require('comfychair/jasmine');
var comfy = require('comfychair');
var cbuf = require('ceci-buffers');
var chan = require('../index');
var channelSpec = require('./channels_spec');


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


var randomList = function(minLen, maxLen, randomElement) {
  var n = comfy.randomInt(minLen, maxLen);
  var result = [];
  for (var i = 0; i < n; ++i)
    result.push(randomElement());
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


var shrinkObject = function(obj, shrinkers) {
  var result = [];

  for (var k in obj) {
    shrinkers[k](obj[k]).forEach(function(x) {
      var tmp = merge(obj);
      tmp[k] = x;
      result.push(tmp);
    });
  }

  return result;
};


var pack = function(list) {
  return list.map(function(x) { return [x]; });
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
    init: function(state, descriptors) {
      return {
        state: specs.map(function(desc) {
          var channel = channelSpec.model(desc.type);
          var state   = channel.apply(null, 'init', desc.size);
          return {
            channel: channel,
            state  : state
          };
        })
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
    select: function(state, cmds, defaultVal) {
      for (var i = 0; i < cmds.length; ++i) {
        var ch  = cmds[i].chan;
        var val = cmds[i].val;
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
      var descriptors = randomList(0, k, function() {
        return {
          type: comfy.randomInt(0, 3),
          size: comfy.randomInt(0, k)
        };
      });
      return [descriptors];
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
      var k = Math.floor(Math.sqrt(size) / 2);
      var cmds = randomList(0, k, function() {
        return {
          chan: comfy.randomInt(0, size),
          val : comfy.randomInt(-k, k)
        };
      });
      var defaultVal = comfy.randomInt(-k, k);
      return [cmds, defaultVal];
    }
  };

  var _shrinkArgs = {
    init: function(args) {
      var shrinkers = {
        type: comfy.shrinkInt,
        size: comfy.shrinkInt
      };
      return pack(shrinkList(args[0], function(item) {
        return shrinkObject(item, shrinkers);
      }));
    },
    push: function(args) {
      return shrinkObject(args, [comfy.shrinkInt, comfy.shrinkInt]);
    },
    pull: function(args) {
      return pack(shrinkInt(args[0]));
    },
    close: function(args) {
      return pack(shrinkInt(args[0]));
    },
    select: function(args) {
      var cmdShrinkers = {
        chan: comfy.shrinkInt,
        val : comfy.shrinkInt
      };
      return shrinkObject(args, [
        function(item) { return shrinkObject(item, cmdShrinkers); },
        shrinkInt
      ]);
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
