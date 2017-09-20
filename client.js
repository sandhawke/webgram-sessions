'use strict'

// KEEP this file in sync with browser_client.js
//
// or figure out how to factor them together, given packaging for the browser...

// const webgram = require('webgram')
const debug = require('debug')('webgram_sessions_client')
const myStorage = require('./storage')

function hook (client, options = {}) {
  return new Hook(client, options)
}

class Hook {
  constructor (client, options) {
    this.client = client
    Object.assign(this, options)

    if (client.sessionsHook) throw Error('sessions hook already installed')
    client.sessionsHook = this
    debug('hook installed')

    const localStorage = myStorage(options)
    const realSend = client.send.bind(client)
    const sessionBuffer = []
    let inSession = false

    debug('intercepting client.send')
    client.send = (...args) => {
      if (inSession) {
        realSend(...args)
      } else {
        debug('buffering until session is ready %o', args)
        sessionBuffer.push(JSON.stringify(args))
      }
    }

    client.on('session-error', msg => {
      throw Error('login failed: ' + msg)
    })

    client.on('session-ok', async (id, secret) => {
      if (secret) {
        const sessionData = {
          address: client.address,
          id,
          secret,
          whenAdded: new Date()
        }
        client.sessionData = sessionData
        localStorage.setItem(client.address, JSON.stringify(sessionData))
      }
      debug('session active, okay to do stuff in session')

      debug('sending old stuff')
      for (let item of sessionBuffer) {
        debug('sending queued message', item)
        // use low-level send because we already stringified it, for
        // buffering safely
        this.client.socket.send(item)
      }
      inSession = true
      debug('sending normally now')

      client.emit('$session-active')
    })

    //
    // Look up saved session auth data, if any, and send it
    //

    if (!client.sessionData) {
      debug('looking for saved session data')
      client.sessionData = JSON.parse(localStorage.getItem(client.address))
    }

    if (client.sessionData) {
      debug('trying to resume session using %O', client.sessionData)
      realSend('session-resume',
               client.sessionData.id,
               client.sessionData.secret)
    } else {
      debug('no session data found; starting new session')
      realSend('session-create')
    }
  }
}

module.exports = { hook, Hook }

// for when this gets substituted for index.js by browserify
module.exports.client = { hook, Hook }
