'use strict';

var cc = require('ceci-core');
var cb = require('ceci-buffers');


function Channel(buffer) {
  this.buffer   = buffer;
  this.pending  = new cb.impl.RingBuffer(1);
  this.data     = new cb.impl.RingBuffer(1);
  this.pressure = 0;
  this.isClosed = false;
};

var MAX_PENDING = 8192;

Channel.prototype.addPending = function(client, val) {
  if (this.pending.isFull()) {
    if (this.pending.capacity() >= MAX_PENDING)
      return false;
    this.pending.resize(
      Math.min(MAX_PENDING, Math.ceil(this.pending.capacity() * 1.5)));
  }
  this.pending.write(client);

  if (val !== undefined) {
    if (this.data.isFull())
      this.data.resize(Math.ceil(this.data.capacity() * 1.5));
    this.data.write(val);
  }

  return true;
};

Channel.prototype.pushBuffer = function(val) {
  return this.buffer ? this.buffer.push(val) : false;
};

Channel.prototype.pullBuffer = function() {
  if (this.buffer)
    return this.buffer.pull()[0];
};

Channel.prototype.tryPush = function(val) {
  var client;

  while (this.pressure < 0) {
    client = this.pending.read();
    ++this.pressure;
    if (!client.isResolved()) {
      client.resolve(this.pushBuffer(val) ? this.pullBuffer() : val);
      return true;
    }
  }

  return this.pushBuffer(val);
};

Channel.prototype.requestPush = function(val, client) {
  if (val === undefined)
    client.reject(new Error("push() requires an value"));
  else if (this.isClosed)
    client.resolve(false);
  else if (this.tryPush(val))
    client.resolve(true);
  else if (!this.addPending(client, val))
    client.reject(new Error("channel queue overflow"));
  else
    ++this.pressure;
};

Channel.prototype.tryPull = function() {
  var client, val, pulled;

  while (this.pressure > 0) {
    client = this.pending.read();
    val    = this.data.read();
    --this.pressure;

    if (!client.isResolved()) {
      pulled = this.pullBuffer();
      if (pulled !== undefined) {
        this.pushBuffer(val);
        val = pulled;
      }
      client.resolve(true);
      return val;
    }
  }

  return this.pullBuffer();
};

Channel.prototype.requestPull = function(client) {
  var res = this.tryPull();
  if (res !== undefined)
    client.resolve(res);
  else if (this.isClosed)
    client.resolve();
  else if (!this.addPending(client))
    client.reject(new Error("channel queue overflow"));
  else
    --this.pressure;
};

Channel.prototype.close = function() {
  var val = this.pressure < 0 ? undefined : false;
  var client;

  while (this.pending && !this.pending.isEmpty()) {
    client = this.pending.read();
    client.resolve(val);
  }

  this.pending = null;
  this.data = null;
  this.pressure = 0;
  this.isClosed = true;
};


exports.chan = function(arg) {
  var buffer;
  if (typeof arg == "object")
    buffer = arg;
  else if (arg)
    buffer = new cb.Buffer(arg);
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


var isObject = function(x) {
  return x != null && x.constructor === Object;
};


var randomShuffle = function(a) {
  var i, k, t;
  for (i = a.length; i > 1; --i) {
    k = Math.floor(Math.random() * i);
    t = a[k];
    a[k] = a[i-1];
    a[i-1] = t;
  }
};


var makeClient = function(channel, result, cleanup) {
  var resolved = false;

  return {
    resolve: function(val) {
      cleanup();
      if (!result.isResolved())
        result.resolve({ channel: channel, value: val });
    },
    reject: function(err) {
      cleanup();
      if (!result.isResolved())
        result.reject(new Error(err));
    },
    cancel: function() {
      resolved = true;
    },
    isResolved: function() {
      return resolved;
    }
  };
};


exports.select = function() {
  var args    = Array.prototype.slice.call(arguments);
  var options = isObject(args[args.length - 1]) ? args.pop() : {};
  var result  = cc.defer();
  var active  = [];
  var cleanup = function() {
    for (var i = 0; i < active.length; ++i)
      active[i].cancel();
  };
  var i, op, channel, client;

  if (!options.priority)
    randomShuffle(args);

  for (i = 0; i < args.length; ++i) {
    op = args[i];
    if (op == null)
      continue;

    if (!Array.isArray(op)) {
      channel = op;
      client = makeClient(channel, result, cleanup);
      channel.requestPull(client);
    } else {
      channel = op[0];
      client = makeClient(channel, result, cleanup);
      channel.requestPush(op[1], client);
    }

    active.push(client);

    if (result.isResolved())
      break;
  }

  if (options.hasOwnProperty('default') && !result.isResolved()) {
    cleanup();
    result.resolve({ channel: null, value: options['default'] });
  }

  return result;
};
