// Generated by CoffeeScript 1.9.3
var User, americano, log;

americano = require('americano-cozy');

log = require('printit')({
  prefix: 'user:model'
});

module.exports = User = americano.getModel('User', {
  timezone: {
    type: String,
    "default": "Europe/Paris"
  }
});

User.getTimezone = function(callback) {
  return User.all(function(err, users) {
    var ref;
    if (err) {
      return callback(err);
    }
    return callback(null, (users != null ? (ref = users[0]) != null ? ref.timezone : void 0 : void 0) || "Europe/Paris");
  });
};

User.updateUser = function(callback) {
  return User.getTimezone(function(err, timezone) {
    var message;
    if (err) {
      message = "Something went wrong during timezone retrieval -- " + err;
      log.error(message);
      User.timezone = 'Europe/Paris';
    } else {
      User.timezone = timezone || "Europe/Paris";
    }
    return typeof callback === "function" ? callback() : void 0;
  });
};
