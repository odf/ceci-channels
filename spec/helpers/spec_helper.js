'use strict';

var G = require('../generative');


var customMatchers = {
  toSucceedOn: function(generator, shrinker) {
    var result = G.check(this.actual, generator, shrinker);
    this.message = function() { return result.cause; };
    return result.successful;
  },
  toConformTo: function(model) {
    var result = G.checkSystem(this.actual, model);
    this.message = function() { return result.cause; };
    return result.successful;
  }
};

beforeEach(function() { this.addMatchers(customMatchers) });
