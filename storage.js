
const Storage = require('dom-storage')

module.exports = (options) => {
  if (typeof window === 'undefined') {
    return new Storage(
      options.clientSecretsDBName || 'webgram-client-secrets.json',
      { strict: true, ws: '  ' }
    )
  } else {
    return window.localStorage
  }
}
