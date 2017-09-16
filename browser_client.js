'use strict'

function attach (client, options) {
  client.on('login-failed', fail => {
    throw Error('login failed: ' + fail)   // .msg?
  })
  client.on('you-are-logged-in', userData => {
    window.localStorage.setItem('currentLogin', JSON.stringify(userData))

    // Add it to a table of many saved logins to select among
    let logins = window.localStorage.getItem('logins') || '{}'
    logins = JSON.parse(logins)
    logins[userData._uid] = userData
    logins = JSON.stringify(logins)
    window.localStorage.setItem('logins', logins)

    client.emit('$login', userData)
  })

  client.userData = JSON.parse(window.localStorage.getItem('currentLogin'))
  if (!client.userData) {
    client.userData = { create: true }
  }
  client.send('please-log-me-in', client.userData)
}

module.exports.client = { attach }
module.exports.attach = attach
