'use strict';

var Generative = module.exports = {};


Generative.random = function(min, max) {
  return min + Math.random() * (max - min);
};

Generative.randomInt = function(min, max) {
  return min + Math.floor(Math.random() * (max - min));
};

Generative.oneOf = function(list) {
  return list[Generative.randomInt(0, list.length)];
};

Generative.success = function(cause) {
  return { successful: true, cause: cause };
};

Generative.failure = function(cause) {
  return { successful: false, cause: cause };
};


var shrink = function(predicate, candidate, shrinker) {
  var smallest = candidate;
  var done = false;
  var shrunk, i;

  shrinker = shrinker || function() { return []; } 

  while (!done) {
    shrunk = shrinker(smallest);
    done = true;

    for (i in shrunk) {
      if (!predicate(shrunk[i])) {
        smallest = shrunk[i];
        done = false;
        break;
      }
    }
  }

  return smallest;
};


Generative.check = function(predicate, generator, shrinker, N) {
  var i, candidate, smallest;

  N = N || 100;

  for (i = 0; i < N; ++i) {
    candidate = generator(i);

    if (!predicate(candidate).successful) {
      smallest = shrink(predicate, candidate, shrinker);
      return Generative.failure('\n' +
                                'Reason: ' + predicate(smallest).cause + '\n' +
                                '     in ' + smallest + '\n' +
                                '  (from ' + candidate + ')');
    }
  }

  return Generative.success();
};


var merge = function(obj1, obj2) {
  var result = (Array.isArray(obj1) && Array.isArray(obj2)) ? [] : {};
  var key;
  for (key in obj1)
    result[key] = obj1[key];
  for (key in obj2)
    result[key] = obj2[key];
  return result;
};


var simulate = function(model, session) {
  var state = model.initial();
  var log = [];
  var i, result;

  for (i = 0; i < session.length; ++i) {
    result = model.apply(state, session[j].command, session[j].args);
    state  = result.state;
    log.append(merge(session[j], {
      state : result.state,
      output: result.output,
      thrown: result.thrown
    }));
  }

  return log;
};


var session = function(model, size) {
  var G = Generative;
  var n = G.randomInt(1, size+1);
  var session = [];
  var i, command;

  for (i = 0; i < n; ++i) {
    command = G.oneOf(model.commands(state));
    session.append({
      command: command,
      args   : model.randomArgs(state, command, size)
    });
  }

  return simulate(model, session);
};


var shrinkSession = function(model, log) {
  var result = []
  var i, shrunk;

  for (i = 0; i < log.length; ++i) {
    shrunk = log.slice();
    shrunk.splice(i, 1);
    result.append(simulate(model, shrunk));
  }

  return result;
};


var verify = function(system, log) {
  var i, output, thrown;

  system.reset();

  for (i = 0; i < log.length; ++i) {
    try {
      output = system.apply(log[i].command, log[i].args);
    } catch(ex) {
      thrown = ex;
    }

    if (thrown != log[i].thrown)
      return {
        successful: false,
        cause: ('step ' + i + ' should throw ' + log[i].thrown +
                ', got ' + thrown)
      };
    else if (output != log[i].output)
      return {
        successful: false,
        cause: ('step ' + i + ' should return ' + log[i].output +
                ', got ' + output)
      };
  }

  return { successful: true };
};


Generative.checkSystem = function(model, system, N) {
  var predicate = function(log) { return verify(system, log); };
  var generator = function(i)   { return session(model, i); };
  var shrinker  = function(log) { return shrinkSession(model, log); };

  return Generative.check(predicate, generator, shrinker, N);
};
