(function(window) {
    "use strict";

    // Expects scope in the form:
    //
    // {
    //     data: [{
    //         name:  string,
    //         value: number,
    //         color: string
    //     }, ...]
    // }

    var Fn          = window.Fn;

    var assign      = Object.assign;
    var tau         = Math.PI * 2;
    var add         = Fn.add;
    var get         = Fn.get;
    var toCartesian = Fn.toCartesian;
    var radius      = 0.5;

    Sparky.fn['pie-chart'] = function(node, stream, params) {
        // Centre of the circle

        var startAngle = params[0] || 0;
        var startPolar = [radius, startAngle];

        return stream.map(function(scope) {
            var data  = scope.data;
            var total = data.map(get('value')).reduce(add, 0);
            var polar = startPolar;

            scope.radius = radius;
            scope.paths = data.map(function(data) {
                var value = data.value;
                var ratio = value / total;
                var angle = ratio * tau;
                var start = toCartesian(polar);

                polar = [polar[0], polar[1] + angle];
                var end   = toCartesian(polar);

                // Assign copies symbol properties! This is big, it makes our
                // Observable proxy entirely unreliable. Time to start using
                // WeakMap.
                //return assign({
                //    start:  start,
                //    end:    end,
                //    radius: radius,
                //    angle:  angle
                //}, data);

                return {
                    name:   data.name,
                    value:  data.value,
                    color:  data.color,
                    start:  start,
                    end:    end,
                    radius: radius,
                    angle:  angle
                };
            });

            scope.total = total;
            return scope;
        });
    };
})(this);
