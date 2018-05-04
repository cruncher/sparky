// sparky.fn.calendar
//
// <div sparky-fn="calendar:'2018-01-01',14">

import { Functor as Fn, Stream, get, prepad, nowDate, addDate, floorDate, formatDate, formatDateISO, diffDateDays, parseDate, nothing } from '../../fn/fn.js';
import dom from '../../dom/dom.js';
import Sparky from '../sparky.js';

var Observable = window.Observable;
var observe    = Observable.observe;

var addDate1   = addDate('0000-00-01');

function floorReducer(date, token) {
    return floorDate(token, date);
}

// calendar: name, duration, floor
//
// name     = property name to get calendar date from
// duration = length of dates to generate, in the form 0000-00-00
// floor    = a string of pipe-seperated floor operations
//
// Outputs a scope with the properties
//
// date     = the current calendar date as an ISO string
// dates    = array of { date: x } objects

Sparky.fn.calendar = function(node, scopes, params) {
    var name     = params[0];

    // Support the old way of defining a duration as number of days
    if (typeof params[1] === 'number') {
        console.warn('Sparky calendar: duration expressed as number, should be form xxxx-xx-xx.' )
    }

    var duration = typeof params[1] === 'string' ? params[1] :
        typeof params[1] === 'number' ? ('0000-00-' + prepad('0', 2, params[1])) :
        '0000-00-42';

    var floor    = params[2] && params[2].split('|');
    var calendar = Observable({ dates: [] });

    // View

    function updateSelected() {
        calendar.dates.forEach(function(dateScope) {
            dateScope.selectedDate = calendar.date === dateScope.date;
        });
    }

    function updateTime(time) {
        calendar.dates.forEach(function(dateScope) {
            dateScope.relativeDate = diffDateDays(dateScope.date, time);
        });
    }

    function updateMonth() {
        var month = calendar.date && formatDate('YYYY-MM', 'UTC', undefined, calendar.date);
        calendar.dates.forEach(function(dateScope) {
            dateScope.selectedMonth = month
            && formatDate('YYYY-MM', 'UTC', undefined, dateScope.date) === month;
        });
    }

    function updateStartStop(date) {
        calendar.dates.length = 0;

        // Floor the start date according to the chain of floors params[2]
        var d1 = calendar.startDate = floor ? floor.reduce(floorReducer, date) : date ;
        var d2 = calendar.stopDate  = addDate(duration, d1);

        var d  = d1;

        while (d < d2) {
            calendar.dates.push({ date: formatDateISO(d) });
            d = addDate1(d);
        }

        updateSelected()
        updateTime(nowDate());
        updateMonth();
    }

    observe(calendar, 'date', updateStartStop);

    // Check date every 5 minutes
    var clock = Stream
    .clock(300)
    .map(nowDate)
    .each(updateTime);

    // Get date from named property of parent scope
    scopes.each(function(parent) {
        observe(parent, name, function(date) {
            calendar.date = formatDateISO(date);
        });
    });

    this.then(clock.stop);

    return Fn.of(calendar);
};

// calendar-move-on-click: duration, min, max
//
// duration - in the form 0000-00-00
// min      - a iso date string or 'now'
// max      = a iso date string or 'now'

Sparky.fn['calendar-move-on-click'] = function(node, scopes, params) {
    var calendar = nothing;

    if (!params[0]) {
        throw new Error('Sparky calendar-date-add-on-click:duration requires a duration param');
    }

    var add = addDate(params[0]);

    dom
    .events('click', node)
    .map(get('target'))
    .map(dom.closest('button, a'))
    .each(function(value) {
        var min = params[1] === 'now' ?
            nowDate() :
            parseDate(params[1]) ;

        var max = params[2] === 'now' ?
            nowDate() :
            parseDate(params[2]) ;

        // Restrict back button to never go before min or after max date
        //var date = floorDate('fortnight', addDate('-' + duration, calendar.date));
        var date = add(calendar.date);
        date = min && date < min ? min : date ;
        date = max && date > max ? max : date ;
        calendar.date = formatDateISO(date);
    });

    return scopes.tap(function(scope) {
        calendar = scope;
    });
};
