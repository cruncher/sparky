
import { test as group } from '../../fn/module.js';
import Sparky from '../module.js';

group('input[type="text"]', function(test, log, fixture) {
	test('input[type="text"]', function(equals, done) {
		var model = {
			property1: {},
			property2: {},
		};

		Sparky(fixture).push(model);

		requestAnimationFrame(function() {
//			equals('boo', node.value);
//
//			node.value = '';
//			node.dispatchEvent(inputEvent);
//			equals(undefined, model.property);
//
//			node.value = 'boo';
//			node.dispatchEvent(inputEvent);
//			equals('boo', model.property);
//
//			Observer(model).property = false;
//
//			requestAnimationFrame(function() {
//				equals('', node.value);
//				done();
//			});
		});
	});
}, function() {/*

<div fn="entries each">{[.]}</div>

*/});
