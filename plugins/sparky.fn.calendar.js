// sparky.fn.calendar
//
// <div sparky-fn="calendar:'2018-01-01',14">

(function(window) {
    "use strict";

    var Fn         = window.Fn;
    var Stream     = window.Stream;
    var Observable = window.Observable;
    var dom        = window.dom;
    var Sparky     = window.Sparky;

    var get        = Fn.get;
    var prepad     = Fn.prepad;
    var nowDate    = Fn.nowDate;
    var addDate    = Fn.addDate;
    var floorDate  = Fn.floorDate;
    var formatDate = Fn.formatDate;
    var formatDateISO = Fn.formatDateISO;
    var diffDateDays = Fn.diffDateDays;
    var nothing    = Fn.nothing;
    var observe    = Observable.observe;

    function floorReducer(date, token) {
        //console.log('FLOOR', date, string, floorDate(string, date))
        return floorDate(token, date);
    }

	Sparky.fn.calendar = function(node, scopes, params) {
        var name      = params[0];

        if (typeof params[1] === 'number') {
            console.warn('Sparky calendar: duration expressed as number, should be form xxxx-xx-xx.' )
        }

        var duration  = typeof params[1] === 'string' ? params[1] :
            typeof params[1] === 'number' ? ('0000-00-' + prepad('0', 2, params[1])) :
            '0000-00-42';


        var floor     = params[2] && params[2].split('|');
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
                calendar.dates.push({
                    date: formatDateISO(d)
                });
                d = addDate('0000-00-01', d);
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

    Sparky.fn.prevNextCalendar = function(node, scopes, params) {
        // Controller

        var calendar = nothing;

        dom.events('click', node)
        .map(get('target'))
        .map(dom.closest('.next-thumb'))
        .each(function(value) {
            calendar.date = formatDateISO(floorDate('fortnight', addDate('0000-00-' + dayCount, calendar.date)));
        });

        dom.events('click', node)
        .map(get('target'))
        .map(dom.closest('.prev-thumb'))
        .each(function(value) {
            // Restrict back button to never go before current date
            var now  = nowDate();
            var date = floorDate('fortnight', addDate('-0000-00-' + dayCount, calendar.date));
            calendar.date = formatDateISO(date > now ? date : now);
        });

        return scopes.tap(function(scope) {
            calendar = scope;
        });
    };
})(this);
