
import { Functor as Fn } from '../../fn/fn.js';
import Sparky from '../sparky.js';

group('Parent sparky', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;
	var obj1 = {
		'sub': obj1,
		'property': 'prop2'
	};

	var obj2 = { property: 'prop1' };

	Sparky.fn['ctrl'] = function(node, scopes) {
		return Fn.of(obj1);
	};

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div = fixture.querySelector('[sparky-fn="ctrl"]');
		var p1  = fixture.querySelector('[sparky-fn="get:\'sub\'"]');
		var sparky = Sparky(div);

		frame(function() {
			equals('prop2',  p1.innerHTML);

			Observable(obj1).property = 'newprop2';

			frame(function() {
				equals('newprop2', p1.innerHTML);

				sparky.stop();

				Observable(obj1).property = 'stopprop1';

				frame(function() {
					equals('newprop2', p1.innerHTML);
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
