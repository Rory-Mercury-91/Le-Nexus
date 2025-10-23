const Store = require('electron-store');

const schema = {
  coversDirectory: {
    type: 'string',
    default: ''
  },
  currentUser: {
    type: 'string',
    default: ''
  }
};

const store = new Store({ schema });

module.exports = store;
