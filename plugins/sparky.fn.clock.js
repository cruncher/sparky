import { Stream, Observer } from '../../fn/fn.js';
import Sparky from '../sparky.js';

Sparky.fn.clock = function(node, scopes, params) {
	var observable = Observer({
		time: new Date()
	});

	return Stream.clock(params && params[0] || 1).map(function() {
		observable.time = new Date();
		return observable;
	});
};
