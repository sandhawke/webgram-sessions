'use strict'

const webgram = require('webgram')

function attach (arg, opts) {
  if (arg instanceof webgram.Server) {
    return module.exports.server.attach(arg, opts)
  }
  if (arg instanceof webgram.Client) {
    return module.exports.client.attach(arg, opts)
  }
  throw Error('.attach first arg much be a webgram Client or Server')
}

module.exports.server = require('./server')
module.exports.client = require('./client')
module.exports.Client = require('./client').Client
module.exports.attach = attach
