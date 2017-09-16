'use strict'

const webgram = require('.')

const conn = new webgram.Client()
conn.on('$pong', x => {
  conn.send('equal', x, 100)
  conn.send('end')
  console.log('got pong', x)
  document.body.innerHTML = '<h1>Test complete.  Close this window please.</h1>'
  // setTimeout(() => {document.location = 'http://hawke.org/'}, 1000)
})
conn.send('$ping', 100)

conn.on('$login', userData => {
  console.log('userData', userData)
})
