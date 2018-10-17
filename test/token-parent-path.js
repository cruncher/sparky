
import { Fn, Observer, test as group } from '../../fn/fn.js';
import Sparky from '../sparky.js';

group('tokens ..parent.path', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;
	var obj1 = { property: 'prop1' };
    var obj2 = { property: 'prop2' };
    var sparky;

	Sparky.fn['fn1'] = function(node, scopes) {
		return Fn.of(obj1);
	};

    Sparky.fn['fn2'] = function(node, scopes) {
        sparky = this;
		return Fn.of(obj2);
	};

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('[sparky-fn="fn1"]');
		var p      = fixture.querySelector('[sparky-fn="fn2"]');
		Sparky(div);

		frame(function() {
			equals(obj1.property,  p.innerHTML);

			Observer(obj1).property = 'newprop1';

			frame(function() {
				equals(obj1.property,  p.innerHTML);

				sparky.stop();

				Observer(obj1).property = 'stopprop1';

				frame(function() {
					equals('newprop1', p.innerHTML);
					done();
				});
			});
		});
	}, 3);

}, function() {/*

<div sparky-fn="fn1">
	<p sparky-fn="fn2">{[..property]}</p>
</div>

*/});
