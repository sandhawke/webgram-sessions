const webgram = require('webgram')
const sessions = require('webgram-sessions')

const server = new webgram.Server({port: 5678})
sessions.attach(server)
server.on('$session-active', conn => {
  console.log('connection opened from', conn.address)
  const prev = conn.sessionData.lastValue
  if (prev) {
    console.log('a repeat visitor: previous result was', prev)
  } else {
    console.log('a new visitor')
  }

  conn.on('add-one', x => {
    console.log('handling request to increment', x)
    conn.send('added-one', x + 1)
    conn.sessionData.lastValue = x + 1
    conn.save()
  })
})
