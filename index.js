'use strict'

function hook (arg, opts) {
  if (arg.acceptsWebgramServerHooks) {
    return module.exports.server.hook(arg, opts)
  }
  if (arg.acceptsWebgramClientHooks) {
    return module.exports.client.hook(arg, opts)
  }
  throw Error('.attach first arg must appear as webgram Client or Server')
}

module.exports.server = require('./server')
module.exports.client = require('./client')
module.exports.Client = require('./client').Client
module.exports.hook = hook
