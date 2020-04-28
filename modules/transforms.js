
// Import config
import { translations } from '../config.js';

// Import uncurried functions from Fn library modules
import { getPath } from '../../fn/modules/get-path.js';
import { equals }  from '../../fn/modules/equals.js';
import { get }     from '../../fn/modules/get.js';
import { has }     from '../../fn/modules/has.js';
import { invoke }  from '../../fn/modules/invoke.js';
import { is }      from '../../fn/modules/is.js';
import isDefined   from '../../fn/modules/is-defined.js';
import { matches } from '../../fn/modules/matches.js';
import not         from '../../fn/modules/not.js';
import toInt       from '../../fn/modules/parse-int.js';
import { toFixed } from '../../fn/modules/to-fixed.js';
import toString    from '../../fn/modules/to-string.js';
import toType      from '../../fn/modules/to-type.js';
import toClass     from '../../fn/modules/to-class.js';
import * as normalise   from '../../fn/modules/normalisers.js';
import * as denormalise from '../../fn/modules/denormalisers.js';

import { sum, exp, limit, log, multiply, pow, root, todB, toLevel, toRad, toDeg } from '../../fn/modules/maths/core.js';
import { mod }     from '../../fn/modules/maths/mod.js';
import toCartesian from '../../fn/modules/maths/to-cartesian.js';
import toPolar     from '../../fn/modules/maths/to-polar.js';

import { append }  from '../../fn/modules/strings/append.js';
import { prepend } from '../../fn/modules/strings/prepend.js';
import { prepad }  from '../../fn/modules/strings/prepad.js';
import { postpad } from '../../fn/modules/strings/postpad.js';
import slugify     from '../../fn/modules/strings/slugify.js';
import toCamelCase from '../../fn/modules/strings/to-camel-case.js';

import { contains } from '../../fn/modules/lists/core.js';
import last from '../../fn/modules/lists/last.js';

import {
	compose,
	overload,
	formatDate,
	formatTime,
	addDate,
	addTime,
	subTime
} from '../../fn/module.js';


// Import uncurried functions from DOM library

import escape from '../../dom/modules/escape.js';
import { parseValue, toRem, toVw, toVh } from '../../dom/modules/parse-value.js';

var DEBUG     = window.DEBUG === true || window.DEBUG === 'Sparky';
var A         = Array.prototype;
var S         = String.prototype;

const reducers = {
	sum: sum
};

function addType(n) {
	const type = typeof n;
	return type === 'string' ?
		/^\d\d\d\d(?:-|$)/.test(n) ? 'date' :
		/^\d\d(?::|$)/.test(n) ? 'time' :
		'string' :
	type;
}

function interpolateLinear(xs, ys, x) {
	var n = -1;
	while (++n < xs.length && xs[n] < x);

	// Shortcut if x is lower than smallest x
	if (n === 0) {
		return ys[0];
	}

	// Shortcut if x is greater than biggest x
	if (n >= xs.length) {
		return last(ys);
	}

	// Shortcurt if x corresponds exactly to an interpolation coordinate
	if (x === xs[n]) {
		return ys[n];
	}

	// Linear interpolate
	var ratio = (x - xs[n - 1]) / (xs[n] - xs[n - 1]) ;
	return ratio * (ys[n] - ys[n - 1]) + ys[n - 1] ;
}



export const transformers = {

	/** is: value
	Returns `true` where value is strictly equal to `value`, otherwise `false`. */
	is: { tx: is, ix: (value, bool) => (bool === true ? value : undefined) },

	/** has: property
	Returns `true` where value is an object with `property`, otherwise `false`. */
	has: { tx: has },

/**
matches: selector

Renders `true` if value matches `selector`. Behaviour is overloaded to accept
different types of `selector`. Where `selector` is a RegExp, value is assumed
to be a string and tested against it.

```html
{[ .|matches:/abc/ ]}     // `true` if value contains 'abc'
```

Where `selector` is an Object, value is assumed to be an object and its
properties are matched against those of `selector`.

```html
{[ .|matches:{key: 3} ]}  // `true` if value.key is `3`.
```
*/

	matches: {
		tx: overload(toClass, {
			RegExp: (regex, string) => regex.test(string),
			Object: matches
		})
	},

	/** class:
	Renders the Class – the name of the constructor – of value. */
	'class': { tx: toClass },

	/** type:
	Renders `typeof` value. */
	'type': { tx: toType },

	/** Booleans */

	/** yesno: a, b
	Where value is truthy renders `a`, otherwise `b`. */
	yesno: {
		tx: function (truthy, falsy, value) {
			return value ? truthy : falsy;
		}
	},

	/** Numbers */

/** add: n

Adds `n` to value. Behaviour is overloaded to accept various types of 'n'.
Where `n` is a number, it is summed with value. So to add 1 to any value:

```html
{[ number|add:1 ]}
```

Where 'n' is a duration string in date-like format, value is expected to be a
date and is advanced by the duration. So to advance a date by 18 months:

```html
{[ date|add:'0000-18-00' ]}
```

Where 'n' is a duration string in time-like format, value is expected to be a
time and is advanced by the duration. So to put a time back by 1 hour and 20
seconds:

```html
{[ time|add:'-01:00:20' ]}
```

*/
	add: {
		tx: overload(addType, {
			number: function(a, b) { return b.add ? b.add(a) : b + a ; },
			date: addDate,
			time: addTime,
			default: function(n) {
				throw new Error('Sparky add:value does not like values of type ' + typeof n);
			}
		}),

		ix: overload(addType, {
			number: function(a, c) { return c.add ? c.add(-a) : c - a ; },
			date: function (d, n) { return addDate('-' + d, n); },
			time: subTime,
			default: function (n) {
				throw new Error('Sparky add:value does not like values of type ' + typeof n);
			}
		})
	},

	/** floor:
	Floors a number. */
	floor: { tx: Math.floor },

	/** root: n
	Returns the `n`th root of value. */
	root: { tx: root, ix: pow },

	/** normalise: curve, min, max
	Return a value in the nominal range `0-1` from a value between `min` and
	`max` mapped to a `curve`, which is one of `linear`, `quadratic`, `exponential`. */
	normalise: {
		tx: function (curve, min, max, number) {
			const name = toCamelCase(curve);
			return normalise[name](min, max, number);
		},

		ix: function (curve, min, max, number) {
			const name = toCamelCase(curve);
			return denormalise[name](min, max, number);
		}
	},

	/** denormalise: curve, min, max
	Return a value in the range `min`-`max` of a value in the range `0`-`1`,
	reverse mapped to `curve`, which is one of `linear`, `quadratic`, `exponential`. */
	denormalise: {
		tx: function (curve, min, max, number) {
			const name = toCamelCase(curve);
			return denormalise[name](min, max, number);
		},

		ix: function (curve, min, max, number) {
			const name = toCamelCase(curve);
			return normalise[name](min, max, number);
		}
	},

	/** to-db:
	Transforms values in the nominal range `0-1` to dB scale, and, when used in
	two-way binding, transforms them back a number in nominal range. */
	'to-db': { tx: todB, ix: toLevel },

	/** to-cartesian:
	Transforms a polar coordinate array to cartesian coordinates. */
	'to-cartesian': { tx: toCartesian, ix: toPolar },

	/** to-polar:
	Transforms a polar coordinate array to cartesian coordinates. */
	'to-polar': { tx: toPolar, ix: toCartesian },

	/** floatformat: n
	Transforms numbers to strings with `n` decimal places. Used for
	two-way binding, gaurantees numbers are set on scope. */
	floatformat: { tx: toFixed, ix: function (n, str) { return parseFloat(str); } },

	/** floatprecision: n
	Converts number to string representing number to precision `n`. */
	floatprecision: {
		tx: function (n, value) {
			return Number.isFinite(value) ?
				value.toPrecision(n) :
				value;
		},

		ix: parseFloat
	},

	/** Dates */

	/** add: yyyy-mm-dd
	Adds ISO formatted `yyyy-mm-dd` to a date value, returning a new date. */

	/** dateformat: yyyy-mm-dd
	Converts an ISO date string, a number (in seconds) or a Date object
	to a string date formatted with the symbols:

	- `'YYYY'` years
	- `'YY'`   2-digit year
	- `'MM'`   month, 2-digit
	- `'MMM'`  month, 3-letter
	- `'MMMM'` month, full name
	- `'D'`    day of week
	- `'DD'`   day of week, two-digit
	- `'ddd'`  weekday, 3-letter
	- `'dddd'` weekday, full name
	- `'hh'`   hours
	- `'mm'`   minutes
	- `'ss'`   seconds
	- `'sss'`  seconds with decimals
	*/
	dateformat: { tx: formatDate },

	/** Times */

	/** add: duration
	Adds `duration`, an ISO-like time string, to a time value, and
	returns a number in seconds.

	Add 12 hours:

	```html
	{[ time|add:'12:00' ]}
	```

	Durations may be negative. Subtract an hour and a half:

	```html
	{[ time|add:'-01:30' ]}
	```

	Numbers in a `duration` string are not limited by the cycles of the clock.
	Add 212 seconds:

	```html
	{[ time|add:'00:00:212' ]}
	```

	Use `timeformat` to transform the result to a readable format:

	```html
	{[ time|add:'12:00'|timeformat:'h hours, mm minutes' ]}
	```

	Not that `duration` must be quoted because it contains ':' characters.
	May be used for two-way binding.
	*/

	/** timeformat: format
	Formats value, which must be an ISO time string or a number in seconds, to
	match `format`, a string that may contain the tokens:

	- `'±'`   Sign, renders '-' if time is negative, otherwise nothing
	- `'Y'`   Years, approx.
	- `'M'`   Months, approx.
	- `'MM'`  Months, remainder from years (max 12), approx.
	- `'w'`   Weeks
	- `'ww'`  Weeks, remainder from months (max 4)
	- `'d'`   Days
	- `'dd'`  Days, remainder from weeks (max 7)
	- `'h'`   Hours
	- `'hh'`  Hours, remainder from days (max 24), 2-digit format
	- `'m'`   Minutes
	- `'mm'`  Minutes, remainder from hours (max 60), 2-digit format
	- `'s'`   Seconds
	- `'ss'`  Seconds, remainder from minutes (max 60), 2-digit format
	- `'sss'` Seconds, remainder from minutes (max 60), fractional
	- `'ms'`  Milliseconds, remainder from seconds (max 1000), 3-digit format

	```html
	{[ .|timeformat:'±hh:mm' ]}
	-13:57
	```
	*/
	timeformat: { tx: formatTime },



	join: {
		tx: function(string, value) {
			return A.join.call(value, string);
		},

		ix: function(string, value) {
			return S.split.call(value, string);
		}
	},



	multiply:    { tx: multiply,    ix: function(d, n) { return n / d; } },
	degrees:     { tx: toDeg,       ix: toRad },
	radians:     { tx: toRad,       ix: toDeg },
	pow:         { tx: pow,         ix: function(n) { return pow(1/n); } },
	exp:         { tx: exp,         ix: log },
	log:         { tx: log,         ix: exp },


	/** Type converters */

	/** boolean-string:
	Transforms booleans to strings and vice versa. May by used for two-way binding. */
	'boolean-string': {
		tx: function(value) {
			return value === true ? 'true' :
				value === false ? 'false' :
				undefined;
		},

		ix: function (value) {
			return value === 'true' ? true :
				value === 'false' ? false :
				undefined;
		}
	},

	/** float-string:
	Transforms numbers to float strings, and, used for two-way binding,
	gaurantees numbers are set on scope. */
	'float-string': { tx: (value) => value + '', ix: parseFloat },

	/** floats-string: separator
	Transforms an array of numbers to a string using `separator`, and,
	used for two-way binding, gaurantees an array of numbers is set on scope. */
	'floats-string': {
		tx: function (string, value) {
			return A.join.call(value, string);
		},

		ix: function (string, value) {
			return S.split.call(value, string).map(parseFloat);
		}
	},

	/** int-string:
	Transforms numbers to integer strings, and, used for two-way binding,
	gaurantees integer numbers are set on scope. */
	'int-string':   {
		tx: (value) => (value && value.toFixed && value.toFixed(0) || undefined),
		ix: toInt
	},

	/** ints-string: separator
	Transforms an array of numbers to a string of integers seperated with
	`separator`, and, used for two-way binding, gaurantees an array of integer
	numbers is set on scope. */
	'ints-string': {
		tx: function (string, value) {
			return A.join.call(A.map.call(value, (value) => value.toFixed(0)), string);
		},

		ix: function (string, value) {
			return S.split.call(value, string).map(toInt);
		}
	},

	/** string-float:
	Transforms strings to numbers, and, used for two-way binding,
	gaurantees float strings are set on scope. */
	'string-float': { tx: parseFloat, ix: toString },

	/** string-int:
	Transforms strings to integer numbers, and, used for two-way binding,
	gaurantees integer strings are set on scope. */
	'string-int': { tx: toInt, ix: (value) => value.toFixed(0) },

	/** json:
	Transforms objects to json, and used in two-way binding, sets parsed
	objects on scope. */
	json: { tx: JSON.stringify, ix: JSON.parse },

	interpolate: {
		tx: function(point) {
			var xs = A.map.call(arguments, get('0'));
			var ys = A.map.call(arguments, get('1'));

			return function(value) {
				return interpolateLinear(xs, ys, value);
			};
		},

		ix: function(point) {
			var xs = A.map.call(arguments, get('0'));
			var ys = A.map.call(arguments, get('1'));

			return function(value) {
				return interpolateLinear(ys, xs, value);
			}
		}
	},


	deg:       { tx: toDeg, ix: toRad },
	rad:       { tx: toRad, ix: toDeg },
	level:     { tx: toLevel, ix: todB },
	px:        { tx: parseValue, ix: toRem },
	rem:       { tx: toRem, ix: parseValue },
	vw:        { tx: toVw,  ix: parseValue },
	vh:        { tx: toVh,  ix: parseValue },
    not:       { tx: not,   ix: not }
};

export const transforms = {
	contains:     contains,
	equals:       equals,
	escape:       escape,
	exp:          exp,

	get:          getPath,
	invoke:       invoke,

	last:         last,
	limit:        limit,
	log:          log,
	max:          Math.max,
	min:          Math.min,
	mod:          mod,

	/** Strings */

	/** append: string
	Returns value + `string`. */
	append:       append,

	/** prepend: string
	Returns `string` + value. */
	prepend:      prepend,

	/** prepad: string, n
	Prepends value with `string` until the output is `n` characters long. */
	prepad:       prepad,

	/** postpad: string, n
	Appends value with `string` until the output is `n` characters long. */
	postpad:      postpad,

	/** slugify:
	Returns the slug of value. */
	slugify:      slugify,

	divide: function(n, value) {
		if (typeof value !== 'number') { return; }
		return value / n;
	},


	/** is-in: array
	Returns `true` if value is contained in `array`, otherwise `false`.

	```html
	{[ path|is-in:[0,1] ]}
	```
	*/
	'is-in': function(array, value) {
		return array.includes(value);
	},

	'find-in': function(path, id) {
		if (!isDefined(id)) { return; }
		var array = getPath(path, window);
		return array && array.find(compose(is(id), get('id')));
	},

	"greater-than": function(value2, value1) {
		return value1 > value2;
	},

	invert: function(value) {
		return typeof value === 'number' ? 1 / value : !value ;
	},

	"less-than": function(value2, value1) {
		return value1 < value2 ;
	},

	/** localise:n
	Localises a number to `n` digits. */
	localise: function(digits, value) {
		var locale = document.documentElement.lang;
		var options = {};

		if (isDefined(digits)) {
			options.minimumFractionDigits = digits;
			options.maximumFractionDigits = digits;
		}

		// Todo: localise value where toLocaleString not supported
		return value.toLocaleString ? value.toLocaleString(locale, options) : value ;
	},


	/** lowercase:
	Returns the lowercase string of value. */
	lowercase: function(value) {
		if (typeof value !== 'string') { return; }
		return String.prototype.toLowerCase.apply(value);
	},

	map: function(method, params, array) {
		//var tokens;
		//
		//if (params === undefined) {
		//	tokens = parsePipe([], method);
		//	fn     = createPipe(tokens, transforms);
		//	return function(array) {
		//		return array.map(fn);
		//	};
		//}

		var fn = (
			(transformers[method] && transformers[method].tx) ||
			transforms[method]
		);

		return array && array.map((value) => fn(...params, value));
	},

	filter: function(method, args, array) {
		var fn = (
			(transformers[method] && transformers[method].tx) ||
			transforms[method]
		);

		return array && array.filter((value) => fn(...args, value));
	},

	/** pluralise: str1, str2, lang
	Where value is singular in a given `lang`, retuns `str1`, otherwise `str2`. */
	pluralise: function(str1, str2, lang, value) {
		if (typeof value !== 'number') { return; }

		str1 = str1 || '';
		str2 = str2 || 's';

		// In French, numbers less than 2 are considered singular, where in
		// English, Italian and elsewhere only 1 is singular.
		return lang === 'fr' ?
			(value < 2 && value >= 0) ? str1 : str2 :
			value === 1 ? str1 : str2 ;
	},

	reduce: function(name, initialValue, array) {
		return array && array.reduce(reducers[name], initialValue || 0);
	},

	replace: function(str1, str2, value) {
		if (typeof value !== 'string') { return; }
		return value.replace(RegExp(str1, 'g'), str2);
	},

	round: function round(n, value) {
		return Math.round(value / n) * n;
	},

	slice: function(i0, i1, value) {
		return typeof value === 'string' ?
			value.slice(i0, i1) :
			Array.prototype.slice.call(value, i0, i1) ;
	},

	striptags: (function() {
		var rtag = /<(?:[^>'"]|"[^"]*"|'[^']*')*>/g;

		return function(value) {
			return value.replace(rtag, '');
		};
	})(),

	translate: (function() {
		var warned = {};

		return function(value) {
			var text = translations[value] ;

			if (!text) {
				if (!warned[value]) {
					console.warn('Sparky: config.translations contains no translation for "' + value + '"');
					warned[value] = true;
				}

				return value;
			}

			return text ;
		};
	})(),

	truncatechars: function(n, value) {
		return value.length > n ?
			value.slice(0, n) + '…' :
			value ;
	},

	uppercase: function(value) {
		if (typeof value !== 'string') { return; }
		return String.prototype.toUpperCase.apply(value);
	}
};

export function register(name, fn, inv) {
	if (DEBUG && transformers[name]) {
		throw new Error('Sparky: transform already registered with name "' + name + '"');
	}

	if (inv) {
		transformers[name] = { tx: fn, ix: inv };
	}
	else {
		if (DEBUG && transforms[name]) {
			throw new Error('Sparky: transform already registered with name "' + name + '"');
		}

		transforms[name] = fn;
	}
}
