'use strict'

const fs = require('fs')
const debug = require('debug')('webgram-logins-client')

function attach (client, options) {
  client.on('login-failed', fail => {
    throw Error('login failed: ' + fail)   // .msg?
  })
  client.on('you-are-logged-in', userData => {
    fs.writeFileSync('./client-login-data.json', JSON.stringify(userData, null, 2), {
      encoding: 'utf8',
      mode: 0o600})
    client.emit('$login', userData)
  })

  if (!client.userData) {
    try {
      client.userData = JSON.parse(fs.readFileSync('./client-login-data.json', 'utf8'))
    } catch (e) {
      debug('error reading client-userData.json', e.message)
    }
  }
  if (!client.userData) {
    client.userData = { create: true }
  }
  client.send('please-log-me-in', client.userData)
}

module.exports.attach = attach
