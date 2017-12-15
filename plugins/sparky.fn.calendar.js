// sparky.fn.calendar
//
// <div sparky-fn="calendar:'2018-01-01',14">

(function(window) {
    "use strict";

    var Fn         = window.Fn;
    var Stream     = window.Stream;
    var Observable = window.Observable;
    var dom        = window.dom;
    var Time       = window.Time;
    var Sparky     = window.Sparky;

    var get        = Fn.get;
    var observe    = Observable.observe;

	Sparky.fn.calendar = function(node, scopes, params) {
        var name      = params[0];
        var dayCount  = params[1] || '35';
        var floor     = params[2];
        var scope = Observable({
            data: []
        });

        // View

        function updateTime(time) {
            scope.data.forEach(function(object) {
                object.relativeDate  = Time.secToDays(Time(object.date) - time.floor('day'));
            });
        }

        function updateMonth(time) {
            var month = scope.date && scope.date.floor('month').render('YYYY-MM');
            scope.data.forEach(function(object) {
                object.selectedMonth = month && Time(object.date).render('YYYY-MM') === month;
            });
        }

        function updateStartStop() {
            scope.data.length = 0;
            var d1 = scope.startDate = floor ? scope.date.floor(floor) : time ;
            var d2 = scope.stopDate  = d1.add('0000-00-' + dayCount);
            var d  = d1;

            while (d < d2) {
                scope.data.push({
                    date: d.date
                });

                d = d.add('0000-00-01');
            }

            updateTime(Time.now());
            updateMonth();
        }

        observe(scope, 'date', updateStartStop);

        // Check date every 5 minutes
        var clock = Stream
        .clock(300)
        .map(function() { return Time.now(); })
        .each(updateTime);

        this.then(clock.stop);

        // Controller

        dom.event('click', node)
        .map(get('target'))
        .map(dom.attribute('sparky-calendar-start'))
        .each(function(value) {
            scope.date = scope.date.add(value);
        });

        scopes.each(function(parent) {
            observe(parent, name, function(date) {
                scope.date = Time(date);
            });
        });

        return Fn.of(scope);
    };


    Sparky.fn['selected-on-click'] = function(node, scopes, params) {
        var calendar;

        dom
        .event('click', node)
        .map(get('target'))
        .map(dom.closest('[href="#availability-times"]'))
        .map(Sparky.getScope)
        .each(function(scope) {
            calendar.data
            .filter(get('selected'))
            .forEach(function(object) {
                object.selected = undefined;
            });

            scope.selected = true;
        });

        return scopes.tap(function(scope) {
            calendar = scope;
        });
    };
})(this);
