
import { Stream, test as group, Observer } from '../../fn/module.js';
import Sparky from '../module.js';

group('tokens parent each', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	var obj1 = {
		array: [{}, {}],
		property: 'prop1'
	};

    var sparky;

	Sparky.fn['fn1'] = function(node, scopes) {
		return Stream.of(obj1);
	};

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		sparky = Sparky(div);

		frame(function() {
			equals(2, fixture.querySelectorAll('p').length);
			equals('prop1',  fixture.querySelectorAll('p')[0].innerHTML);
			equals('prop1',  fixture.querySelectorAll('p')[1].innerHTML);

			Observer(obj1).property = 'newprop1';

			frame(function() {
				equals(2, fixture.querySelectorAll('p').length);
				equals('newprop1',  fixture.querySelectorAll('p')[0].innerHTML);
				equals('newprop1',  fixture.querySelectorAll('p')[1].innerHTML);

				sparky.stop();

				Observer(obj1).property = 'stopprop1';

				frame(function() {
					equals('newprop1',  fixture.querySelectorAll('p')[0].innerHTML);
					equals('newprop1',  fixture.querySelectorAll('p')[1].innerHTML);
					done();
				});
			});
		});
	}, 8);

}, function() {/*

<div sparky-fn="fn1">
	<p sparky-fn="get:array each">{[..property]}</p>
</div>

*/});
