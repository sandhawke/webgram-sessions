const sessions = require('webgram-sessions')

const c = new sessions.Client('ws://localhost:5678')
c.on('added-one', x => {
  console.log('responses was', x)
  c.close()
})

c.send('add-one', 999)
