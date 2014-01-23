// Generated by CoffeeScript 1.6.3
"use strict";
var CalDAV_CQValidator, CalendarQueryParser, CozyCalDAVBackend, Exc, ICalParser, SCCS, VCalendar, VEvent, VObject_Reader, VTimezone, VTodo, WebdavAccount, async, axon, time, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Exc = require("cozy-jsdav-fork/lib/shared/exceptions");

SCCS = require("cozy-jsdav-fork/lib/CalDAV/properties/supportedCalendarComponentSet");

CalendarQueryParser = require('cozy-jsdav-fork/lib/CalDAV/calendarQueryParser');

VObject_Reader = require('cozy-jsdav-fork/lib/VObject/reader');

CalDAV_CQValidator = require('cozy-jsdav-fork/lib/CalDAV/calendarQueryValidator');

WebdavAccount = require('../models/webdavaccount');

async = require("async");

axon = require('axon');

time = require("time");

_ref = require("cozy-ical"), ICalParser = _ref.ICalParser, VCalendar = _ref.VCalendar, VTimezone = _ref.VTimezone, VEvent = _ref.VEvent, VTodo = _ref.VTodo;

module.exports = CozyCalDAVBackend = (function() {
  function CozyCalDAVBackend(Event, Alarm, User) {
    var _this = this;
    this.Event = Event;
    this.Alarm = Alarm;
    this.User = User;
    this.createCalendarObject = __bind(this.createCalendarObject, this);
    this._extractCalObject = __bind(this._extractCalObject, this);
    this.saveLastCtag = __bind(this.saveLastCtag, this);
    this.getLastCtag(function(err, ctag) {
      var onChange, socket;
      _this.ctag = ctag + 1;
      _this.saveLastCtag(_this.ctag);
      onChange = function() {
        _this.ctag = _this.ctag + 1;
        return _this.saveLastCtag(_this.ctag);
      };
      socket = axon.socket('sub-emitter');
      socket.connect(9105);
      socket.on('alarm.*', onChange);
      return socket.on('event.*', onChange);
    });
  }

  CozyCalDAVBackend.prototype.getLastCtag = function(callback) {
    return WebdavAccount.first(function(err, account) {
      return callback(err, (account != null ? account.ctag : void 0) || 0);
    });
  };

  CozyCalDAVBackend.prototype.saveLastCtag = function(ctag, callback) {
    var _this = this;
    if (callback == null) {
      callback = function() {};
    }
    return WebdavAccount.first(function(err, account) {
      if (err || !account) {
        return callback(err);
      }
      return account.updateAttributes({
        ctag: ctag
      }, function() {});
    });
  };

  CozyCalDAVBackend.prototype.getCalendarsForUser = function(principalUri, callback) {
    var calendar;
    calendar = {
      id: 'my-calendar',
      uri: 'my-calendar',
      principaluri: principalUri,
      "{http://calendarserver.org/ns/}getctag": this.ctag,
      "{http://calendarserver.org/ns/}supported-calendar-component-set": SCCS["new"](['VEVENT', 'VTODO']),
      "{DAV:}displayname": 'Cozy Calendar'
    };
    return callback(null, [calendar]);
  };

  CozyCalDAVBackend.prototype.createCalendar = function(principalUri, url, properties, callback) {
    return callback(null, null);
  };

  CozyCalDAVBackend.prototype.updateCalendar = function(calendarId, mutations, callback) {
    return callback(null, false);
  };

  CozyCalDAVBackend.prototype.deleteCalendar = function(calendarId, callback) {
    return callback(null, null);
  };

  CozyCalDAVBackend.prototype._toICal = function(obj, timezone) {
    var cal;
    cal = new VCalendar('cozy', 'my-calendar');
    cal.add(obj.toIcal(timezone));
    return cal.toString();
  };

  CozyCalDAVBackend.prototype.getCalendarObjects = function(calendarId, callback) {
    var objects,
      _this = this;
    objects = [];
    return async.parallel([
      function(cb) {
        return _this.Alarm.all(cb);
      }, function(cb) {
        return _this.Event.all(cb);
      }, function(cb) {
        return _this.User.getTimezone(cb);
      }
    ], function(err, results) {
      if (err) {
        return callback(err);
      }
      objects = results[0].concat(results[1]).map(function(obj) {
        return {
          id: obj.id,
          uri: obj.caldavuri || (obj.id + '.ics'),
          calendardata: _this._toICal(obj, results[2]),
          lastmodified: new Date().getTime()
        };
      });
      return callback(null, objects);
    });
  };

  CozyCalDAVBackend.prototype._findCalendarObject = function(calendarId, objectUri, callback) {
    var _this = this;
    return async.series([
      function(cb) {
        return _this.Alarm.byURI(objectUri, cb);
      }, function(cb) {
        return _this.Event.byURI(objectUri, cb);
      }
    ], function(err, results) {
      var object, _ref1, _ref2;
      object = ((_ref1 = results[0]) != null ? _ref1[0] : void 0) || ((_ref2 = results[1]) != null ? _ref2[0] : void 0);
      return callback(err, object);
    });
  };

  CozyCalDAVBackend.prototype._extractCalObject = function(calendarobj) {
    var found, obj, _i, _len, _ref1;
    if (calendarobj instanceof VEvent || calendarobj instanceof VTodo) {
      return calendarobj;
    } else {
      _ref1 = calendarobj.subComponents;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        obj = _ref1[_i];
        found = this._extractCalObject(obj);
        if (found) {
          return found;
        }
      }
      return false;
    }
  };

  CozyCalDAVBackend.prototype._parseSingleObjICal = function(calendarData, callback) {
    var _this = this;
    return new ICalParser().parseString(calendarData, function(err, calendar) {
      if (err) {
        return callback(err);
      }
      return callback(null, _this._extractCalObject(calendar));
    });
  };

  CozyCalDAVBackend.prototype.getCalendarObject = function(calendarId, objectUri, callback) {
    var _this = this;
    return this._findCalendarObject(calendarId, objectUri, function(err, obj) {
      if (err) {
        return callback(err);
      }
      if (!obj) {
        return callback(null, null);
      }
      return _this.User.getTimezone(function(err, timezone) {
        if (err) {
          return callback(err);
        }
        return callback(null, {
          id: obj.id,
          uri: obj.caldavuri || (obj.id + '.ics'),
          calendardata: _this._toICal(obj, timezone),
          lastmodified: new Date().getTime()
        });
      });
    });
  };

  CozyCalDAVBackend.prototype.createCalendarObject = function(calendarId, objectUri, calendarData, callback) {
    var _this = this;
    return this._parseSingleObjICal(calendarData, function(err, obj) {
      var alarm, event;
      if (err) {
        return callback(err);
      }
      if (obj.name === 'VEVENT') {
        event = _this.Event.fromIcal(obj);
        event.caldavuri = objectUri;
        return _this.Event.create(event, function(err, event) {
          return callback(err, null);
        });
      } else if (obj.name === 'VTODO') {
        console.log("ALARM");
        alarm = _this.Alarm.fromIcal(obj);
        alarm.caldavuri = objectUri;
        return _this.Alarm.create(alarm, function(err, alarm) {
          return callback(err, null);
        });
      } else {
        return callback(Exc.notImplementedYet());
      }
    });
  };

  CozyCalDAVBackend.prototype.updateCalendarObject = function(calendarId, objectUri, calendarData, callback) {
    var _this = this;
    return this._findCalendarObject(calendarId, objectUri, function(err, oldObj) {
      if (err) {
        return callback(err);
      }
      return _this._parseSingleObjICal(calendarData, function(err, newObj) {
        var alarm, event;
        if (err) {
          return callback(err);
        }
        if (newObj.name === 'VEVENT' && oldObj instanceof _this.Event) {
          event = _this.Event.fromIcal(newObj).toObject();
          delete event.id;
          return oldObj.updateAttributes(event, function(err, event) {
            console.log("RESULT", err, event);
            return callback(err, null);
          });
        } else if (newObj.name === 'VTODO' && oldObj instanceof _this.Alarm) {
          console.log("ALARM");
          alarm = _this.Alarm.fromIcal(newObj);
          return oldObj.updateAttributes(alarm, function(err, alarm) {
            return callback(err, null);
          });
        } else {
          return callback(Exc.notImplementedYet());
        }
      });
    });
  };

  CozyCalDAVBackend.prototype.deleteCalendarObject = function(calendarId, objectUri, callback) {
    return this._findCalendarObject(calendarId, objectUri, function(err, obj) {
      if (err) {
        return callback(err);
      }
      return obj.destroy(callback);
    });
  };

  CozyCalDAVBackend.prototype.calendarQuery = function(calendarId, filters, callback) {
    var objects, reader, validator,
      _this = this;
    objects = [];
    reader = VObject_Reader["new"]();
    validator = CalDAV_CQValidator["new"]();
    return async.parallel([
      function(cb) {
        return _this.Alarm.all(cb);
      }, function(cb) {
        return _this.Event.all(cb);
      }, function(cb) {
        return _this.User.getTimezone(cb);
      }
    ], function(err, results) {
      var alarms, events, ex, ical, jugglingObj, timezone, uri, vobj, _i, _len, _ref1;
      if (err) {
        return callback(err);
      }
      alarms = results[0], events = results[1], timezone = results[2];
      try {
        _ref1 = alarms.concat(events);
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          jugglingObj = _ref1[_i];
          vobj = reader.read(ical = _this._toICal(jugglingObj, timezone));
          if (validator.validate(vobj, filters)) {
            uri = jugglingObj.caldavuri || (jugglingObj.id + '.ics');
            objects.push({
              id: jugglingObj.id,
              uri: uri,
              calendardata: ical,
              lastmodified: new Date().getTime()
            });
          }
        }
      } catch (_error) {
        ex = _error;
        return callback(ex, []);
      }
      return callback(null, objects);
    });
  };

  return CozyCalDAVBackend;

})();
