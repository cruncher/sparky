import { Stream } from '../../fn/fn.js';
import Sparky from '../sparky.js';

var Observable = window.Observable;

Sparky.fn.clock = function(node, scopes, params) {
	var observable = Observable({
		time: new Date()
	});

	return Stream.clock(params && params[0] || 1).map(function() {
		observable.time = new Date();
		return observable;
	});
};
