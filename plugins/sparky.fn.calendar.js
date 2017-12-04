(function(window) {
    "use strict";

    var Sparky     = window.Sparky;
    var Observable = window.Observable;
    var Fn         = window.Fn;
    var dom        = window.dom;
    var Time       = window.Time;

    var curry      = Fn.curry;
    var get        = Fn.get;
    var observe    = Observable.observe;

	Sparky.fn.calendar = function(node, scopes, params) {
        var scope = Observable({
            startDate: '2017-11-24',
            stopDate:  '2017-12-08',
            data: []
        });

        // View

        function updateTime(time) {
            scope.data.forEach(function(object) {
                object.relativeDate = Time.secToDays(Time(object.date) - time.floor('d'));
            });
        }

        function updateStartStop() {
            scope.data.length = 0;

            var d1 = Time(scope.startDate);
            var d2 = Time(scope.stopDate);
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
            scope.startDate = Time(scope.startDate).add(value).date;
            scope.stopDate  = Time(scope.stopDate).add(value).date;
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
