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

    var curry      = Fn.curry;
    var get        = Fn.get;
    var observe    = Observable.observe;

	Sparky.fn.calendar = function(node, scopes, params) {
        var startDate = params[0] ? Time(params[0]) : Time.now().floor('mon');
        var stopDate  = startDate.add('0000-00-' + (params[1] || '35'));
        var scope = Observable({
            startDate: startDate,
            stopDate:  stopDate,
            data: []
        });

        // View

        function updateTime(time) {
            scope.data.forEach(function(object) {
                object.relativeDate = Time.secToDays(Time(object.date) - time.floor('day'));
            });
        }

        function updateStartStop() {
            scope.data.length = 0;

            var d1 = scope.startDate;
            var d2 = scope.stopDate;
            var d  = d1;

            while (d < d2) {
                scope.data.push({
                    date: d.date
                });

                d = d.add('0000-00-01');
            }

            updateTime(Time.now());
        }

        observe(scope, 'startDate', updateStartStop);
        observe(scope, 'stopDate', updateStartStop);
        updateStartStop();

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
            scope.startDate = scope.startDate.add(value);
            scope.stopDate  = scope.stopDate.add(value);
        });

        return Fn.of(scope);
    };

    Sparky.transformers.temporal = {
        tx: curry(function(past, present, future, date) {
            var today = Time.now().date;
            return date === today ? present :
                date < today ? past :
                future ;
        })
    };
})(this);
