'use strict';


var customMatchers = {
  toSucceed: function() {
    var cause = this.actual.cause;
    this.message = function() { return cause; };
    return this.actual.successful;
  }
};

beforeEach(function() { this.addMatchers(customMatchers) });
