'use strict'

const webgram = require('webgram')
const sessions = require('.')

const conn = new webgram.Client()
console.log(sessions)
sessions.hook(conn)

conn.send('plan', 2)

conn.on('pong', x => {
  conn.send('equal', x, 100)
  conn.send('end')
  console.log('got pong', x)
  document.body.innerHTML = '<h1>Test complete.  Close this window please.</h1>'
})

conn.send('ping', 100)

conn.on('$session-active', userData => {
  console.log('userData', userData)
  conn.send('equal', 1, 1)
})
