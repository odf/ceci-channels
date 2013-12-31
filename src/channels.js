'use strict';

var cc     = require('ceci-core');
var Buffer = require('./buffers').Buffer;


function Channel(buffer) {
  this.buffer   = buffer;
  this.pending  = [];
  this.data     = [];
  this.pressure = 0;
  this.isClosed = false;
};

Channel.prototype.pushBuffer = function(val) {
  return this.buffer ? this.buffer.push(val) : false;
};

Channel.prototype.pullBuffer = function() {
  if (this.buffer)
    return this.buffer.pull()[0];
};

Channel.prototype.tryPush = function(val) {
  if (this.pressure < 0) {
    var client = this.pending.shift();
    client.resolve(this.pushBuffer(val) ? this.pullBuffer() : val);
    ++this.pressure;
    return true;
  } else
    return this.pushBuffer(val);
};

Channel.prototype.requestPush = function(val, client) {
  if (val === undefined)
    client.reject(new Error("push() requires an value"));
  else if (this.isClosed)
    client.resolve(false);
  else if (this.tryPush(val))
    client.resolve(true);
  else {
    this.pending.push(client);
    this.data.push(val);
    ++this.pressure;
  }
};

Channel.prototype.tryPull = function() {
  if (this.pressure > 0) {
    var client = this.pending.shift();
    var val    = this.data.shift();
    var pulled = this.pullBuffer();
    if (pulled !== undefined) {
      this.pushBuffer(val);
      val = pulled;
    }
    client.resolve(true);
    --this.pressure;
    return val;
  } else
    return this.pullBuffer();
};

Channel.prototype.requestPull = function(client) {
  var res = this.tryPull();
  if (res !== undefined)
    client.resolve(res);
  else if (this.isClosed)
    client.resolve();
  else {
    this.pending.push(client);
    --this.pressure;
  }
};

Channel.prototype.cancelRequest = function(client) {
  for (var i = 0; i < this.pending.length; ++i) {
    if (this.pending[i] === client) {
      this.pending.splice(i, 1);
      if (this.pressure > 0) {
        this.data.splice(i, 1);
        --this.pressure;
      } else
        ++this.pressure;
      break;
    }
  }
};

Channel.prototype.close = function() {
  var val = this.pressure < 0 ? undefined : false;

  this.pending.forEach(function(client) {
    client.resolve(val);
  });

  this.pending = [];
  this.data = [];
  this.pressure = 0;
  this.isClosed = true;
};


exports.chan = function(arg) {
  var buffer;
  if (typeof arg == "object")
    buffer = arg;
  else if (arg)
    buffer = new Buffer(arg);
  return new Channel(buffer);
};

exports.push = function(ch, val) {
  var a = cc.defer();
  ch.requestPush(val, a);
  return a;
};

exports.pull = function(ch) {
  var a = cc.defer();
  ch.requestPull(a);
  return a;
};

exports.close = function(ch) {
  ch.close();
};


var makeClient = function(i, channel, result, cleanup) {
  return {
    resolve: function(val) {
      cleanup();
      result.resolve({ index: i, value: val });
    },
    reject: function(err) {
      cleanup();
      result.reject(new Error(err));
    },
    cancel: function() {
      channel.cancelRequest(this);
    }
  };
};

exports.select = function() {
  var args    = Array.prototype.slice.call(arguments);
  var result  = cc.defer();
  var active  = [];
  var cleanup = function() {
    for (var i = 0; i < active.length; ++i)
      active[i].cancel();
  };

  var isPush, channel, value, client;

  for (var i = 0; i < args.length; ++i) {
    isPush = Array.isArray(args[i]);

    if (isPush) {
      channel = args[i][0];
      value   = args[i][1];
    }
    else
      channel = args[i];

    client = makeClient(i, channel, result, cleanup);
    active.push(client);

    if (isPush)
      channel.requestPush(client, value);
    else
      channel.requestPull(client);

    if (result.isResolved())
      break;
  }

  return result;
};
