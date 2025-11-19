const fs = {
  readdir: (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
    }
    if (callback) {
      callback(null, []);
    }
    return Promise.resolve([]);
  },
  readdirSync: () => [],
  readFile: (path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
    }
    if (callback) {
      callback(new Error('File not found'));
    }
    return Promise.reject(new Error('File not found'));
  },
  readFileSync: () => { throw new Error('File not found'); },
  promises: {
    readdir: () => Promise.resolve([]),
    readFile: () => Promise.reject(new Error('File not found')),
  },
  existsSync: () => false,
  statSync: () => ({ isFile: () => false, isDirectory: () => false }),
};

module.exports = fs;

