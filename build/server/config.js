// Generated by CoffeeScript 1.7.1
var DAVServer, americano, e, publicPath;

americano = require('americano');

DAVServer = require('./davserver');

publicPath = __dirname + '/../client/public';

try {
  fs.lstatSync(publicPath);
} catch (_error) {
  e = _error;
  publicPath = __dirname + '/../../client/public';
}

module.exports = {
  common: {
    set: {
      'view engine': 'jade',
      views: './server/views'
    },
    use: [
      americano["static"](publicPath, {
        maxAge: 86400000
      }), americano.bodyParser({
        keepExtensions: true
      }), americano.logger('dev'), americano.errorHandler({
        dumpExceptions: true,
        showStack: true
      }), function(req, res, next) {
        if (req.url.indexOf('/public') !== 0) {
          return next(null);
        }
        req.url = req.url.replace('/public', '/public/sync');
        return DAVServer.exec(req, res);
      }
    ]
  },
  development: [americano.logger('dev')],
  production: [americano.logger('short')],
  plugins: ['americano-cozy']
};
