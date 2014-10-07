// Number.isNaN polyfill.
// http://wiki.ecmascript.org/doku.php?id=harmony:number.isnan
//
// Number.isNaN is better than window.isNaN as it does not do
// type coersion before checking for NaN.

if (!Number.isNaN) {
	(function(globalIsNaN) {
		"use strict";
	
		Object.defineProperty(Number, 'isNaN', {
			value: function isNaN(value) {
				return typeof value === 'number' && globalIsNaN(value);
			},
			configurable: true,
			enumerable: false,
			writable: true
		});
	})(isNaN);
}
