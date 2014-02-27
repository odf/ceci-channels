'use strict';

var Generative = module.exports = {};


Generative.random = function(min, max) {
  return min + Math.random() * (max - min);
};

Generative.randomInt = function(min, max) {
  return min + Math.floor(Math.random() * (max - min));
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
