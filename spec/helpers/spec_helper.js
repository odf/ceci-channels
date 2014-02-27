'use strict';

var G = require('../generative');


var customMatchers = {
  toSucceedOn: function(generator, shrinker) {
    var result = G.check(this.actual, generator, shrinker);
    this.message = function() { return result.cause; };
    return result.successful;
  }
};

beforeEach(function() { this.addMatchers(customMatchers) });
