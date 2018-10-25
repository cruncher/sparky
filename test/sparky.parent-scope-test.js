
import { Fn, test as group, Observer } from '../../fn/fn.js';
import Sparky from '../sparky.js';

group('Parent sparky', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;
	var obj = {
		property: 'prop1',
		sub: { property: 'prop2' }
	};

	Sparky.fn['ctrl'] = function(node, scopes) {
		return Fn.of(obj);
	};

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('[sparky-fn="ctrl"]');
		var p      = fixture.querySelector('[sparky-fn="get:\'sub\'"]');
		var sparky = Sparky(div);

		frame(function() {
			equals('prop1',  p.innerHTML);

			Observer(obj).property = 'newprop1';

			frame(function() {
				equals('newprop1', p.innerHTML);

				sparky.stop();

				Observer(obj).property = 'stopprop1';

				frame(function() {
					equals('newprop1', p.innerHTML);
					done();
				});
			});
		});
	}, 3);

}, function() {/*

<div sparky-fn="ctrl">
	<p sparky-fn="get:'sub'">{[..property]}</p>
</div>

*/});
