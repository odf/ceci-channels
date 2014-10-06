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
    var result = state[i].channel.apply(state[i].state, cmd, [arg]);
    return {
      state: result.state,
      output: JSON.parse(result.output)
    };
  };

  var _makeResult = function(state, i, result) {
    var newState = state.slice();
    newState[i].state = result.state;
    return {
      state : newState,
      output: result.output
    };
  };

  var _applyCh = function(state, i, cmd, arg) {
    if (state.length == 0) {
      return {
        state : state,
        output: []
      };
    }

    i = i % state.length;
    return _makeResult(state, i, _tryCh(state, i, cmd, arg));
  };

  var _transitions = {
    init: function(state, descriptors) {
      return {
        state: descriptors.map(function(desc) {
          var channel = channelSpec.model(desc.type);
          var state   = channel.apply(null, 'init', [desc.size]).state;
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
      if (state.length > 0) {
        for (var i = 0; i < cmds.length; ++i) {
          var ch  = cmds[i].chan % state.length;
          var val = cmds[i].val;
          var cmd = val < 0 ? 'pull' : 'push';
          var res = _tryCh(state, ch, cmd, val);

          if (res.output.length > 0) {
            var result = _makeResult(state, ch, res);
            result.output = result.output.concat(ch);
            return result;
          }
        }
      }

      if (defaultVal < 0) {
        return {
          state : state,
          output: [-1, defaultVal]
        };
      } else {
        return {
          state: state,
          output: []
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
      return pack(comfy.shrinkInt(args[0]));
    },
    close: function(args) {
      return pack(comfy.shrinkInt(args[0]));
    },
    select: function(args) {
      var cmdShrinkers = {
        chan: comfy.shrinkInt,
        val : comfy.shrinkInt
      };
      return shrinkObject(args, [
        function(cmds) {
          return shrinkList(cmds, 
                            function(item) {
                              return shrinkObject(item, cmdShrinkers);
                            });
        },
        comfy.shrinkInt
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
      var result = _transitions[command].apply(null, [state].concat(args));
      return {
        state : result.state,
        output: JSON.stringify(result.output)
      };
    }
  };
};


var implementation = function() {
  var _size, _channels;

  var _commands = {
    init: function(descriptors) {
      _size = descriptors.length;
      _channels = descriptors.map(function(desc) {
        var ch = channelSpec.implementation(desc.type);
        ch.apply('init', [desc.size]);
        return ch;
      });
    },
    push: function(i, val) {
      if (_size == 0)
        return [];
      return JSON.parse(_channels[i % _size].apply('push', [val]));
    },
    pull: function(i) {
      if (_size == 0)
        return [];
      return JSON.parse(_channels[i % _size].apply('pull', []));
    },
    close: function(i) {
      if (_size == 0)
        return [];
      return JSON.parse(_channels[i % _size].apply('close', []));
    },
    select: function(cmds, defaultVal) {
      var args;

      if (_size > 0) {
        args = cmds.map(function(cmd) {
          var ch  = _channels[cmd.chan % _size]._channel;
          var val = cmd.val;
          return val ? [ch, val] : ch;
        });
      } else
        args = [];

      var options = { priority: true };
      if (defaultVal < 0)
        options['default'] = defaultVal;

      var deferred = chan.select.apply(null, args.concat(options));

      if (deferred.isResolved()) {
        var result;

        deferred.then(function(output) {
          if (output.channel == null)
            result = [-1, output.value];
          else
            for (var i = 0; i < _size; ++i) {
              if (output.channel == _channels[i]._channel)
                result = [i, output.value];
            }
        });

        return result;
      } else
        return [];
    }
  };

  return {
    apply: function(command, args) {
      try {
        return JSON.stringify(_commands[command].apply(null, args));
      } catch(ex) { console.error(ex.stack); }
    }
  };
};


describe('the select implementation', function() {
  it('conforms to the appropriate model', function() {
    expect(implementation()).toConformTo(model(), 100);
  });
});
