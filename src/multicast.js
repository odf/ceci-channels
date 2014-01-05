'use strict';

var cc = require('ceci-core');
var chans = require('./channels');


function Multicast(inch) {
  this.channel = inch;
  this.pending = chans.chan();
  this.taps = [];
}

Multicast.prototype.run = function() {
  cc.go(function*() {
    var result, val, i;
    
    for (;;) {
      result = yield chans.select(this.channel, this.pending);
      val = result.value;

      if (val === undefined)
        return;
      else if (result.channel === this.channel) {
        for (i = 0; i < this.taps.length; ++i)
          yield chans.push(this.taps[i], val);
      } else {
        if (val[1])
          this.taps.push(val[0]);
        else {
          i = this.taps.indexOf(val[0]);
          if (i >= 0)
            this.taps.splice(i, 1);
        }
      }
    }
  }.bind(this));
};

exports.multicast = function(inch) {
  var mc = new Multicast(inch);
  mc.run();
  return mc;
};

exports.tap = function(mc, ch) {
  return chans.push(mc.pending, [ch, true]);
};

exports.untap = function(mc, ch) {
  return chans.push(mc.pending, [ch, false]);
};
