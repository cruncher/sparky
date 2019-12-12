
// Import uncurried functions from Fn library

import { getPath } from '../../fn/modules/paths.js';
import equals    from '../../fn/modules/equals.js';
import get       from '../../fn/modules/get.js';
import invoke    from '../../fn/modules/invoke.js';
import is        from '../../fn/modules/is.js';
import isDefined from '../../fn/modules/is-defined.js';
import not       from '../../fn/modules/not.js';
import toFixed   from '../../fn/modules/to-fixed.js';
import toInt     from '../../fn/modules/parse-int.js';
import toString  from '../../fn/modules/to-string.js';
import toType    from '../../fn/modules/to-type.js';
import * as normalise   from '../../fn/modules/normalisers.js';
import * as denormalise from '../../fn/modules/denormalisers.js';

import { add, exp, limit, log, multiply, max, min, mod, pow, root, todB, toLevel, toRad, toDeg } from '../../fn/modules/maths/core.js';
import toCartesian from '../../fn/modules/maths/to-cartesian.js';
import toPolar   from '../../fn/modules/maths/to-polar.js';

import append    from '../../fn/modules/strings/append.js';
import prepend   from '../../fn/modules/strings/prepend.js';
import prepad    from '../../fn/modules/strings/prepad.js';
import postpad   from '../../fn/modules/strings/postpad.js';
import slugify   from '../../fn/modules/strings/slugify.js';
import toCamelCase from '../../fn/modules/strings/to-camel-case.js';

import { contains } from '../../fn/modules/lists/core.js';
import last from '../../fn/modules/lists/last.js';

import {
	compose,
	formatDate,
	formatTime,
	addDate,
	addTime,
	subTime
} from '../../fn/module.js';


// Import uncurried functions from Dom library

import escape from '../../dom/modules/escape.js';
import { toPx, toRem, toVw, toVh } from '../../dom/modules/values.js';


// Helper functions

const toFloat = parseFloat;


var DEBUG     = window.DEBUG === true || window.DEBUG === 'Sparky';
var A         = Array.prototype;
var S         = String.prototype;

const reducers = {
	sum: add
};

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
	add:         {
		tx: function(a, b) { return b.add ? b.add(a) : b + a ; },
		ix: function(a, c) { return c.add ? c.add(-a) : c - a ; }
	},

	'add-date':  { tx: addDate,     ix: function(d, n) { return addDate('-' + d, n); } },
	'add-time':  { tx: addTime,     ix: subTime },
	'to-db':     { tx: todB,        ix: toLevel },

	'to-precision': {
		tx: function(n, value) {
			return Number.isFinite(value) ?
				value.toPrecision(n) :
				value ;
		},

		ix: parseFloat
	},

	join: {
		tx: function(string, value) {
			return A.join.call(value, string);
		},

		ix: function(string, value) {
			return S.split.call(value, string);
		}
	},

	'numbers-string': {
		tx: function(string, value) {
			return A.join.call(value, string);
		},

		ix: function(string, value) {
			return S.split.call(value, string).map(parseFloat);
		}
	},

	multiply:    { tx: multiply,    ix: function(d, n) { return n / d; } },
	degrees:     { tx: toDeg,       ix: toRad },
	radians:     { tx: toRad,       ix: toDeg },
	pow:         { tx: pow,         ix: function(n) { return pow(1/n); } },
	exp:         { tx: exp,         ix: log },
	log:         { tx: log,         ix: exp },
	int:         { tx: function(value) { return toFixed(0, value); }, ix: toInt },
	float:       { tx: toFloat,     ix: toString },
	boolean:     { tx: Boolean,     ix: toString },

	normalise:   {
		tx: function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return normalise[name](min, max, number);
		},

		ix: function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return denormalise[name](min, max, number);
		}
	},

	denormalise:   {
		tx: function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return denormalise[name](min, max, number);
		},

		ix: function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return normalise[name](min, max, number);
		}
	},

	floatformat: { tx: toFixed,     ix: function(n, str) { return parseFloat(str); } },
	'float-string': { tx: (value) => value + '', ix: parseFloat },
	'int-string':   { tx: (value) => value.toFixed(0), ix: toInt },

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

	cartesian: { tx: toCartesian, ix: toPolar },
	polar:     { tx: toPolar, ix: toCartesian },
	deg:       { tx: toDeg, ix: toRad },
	rad:       { tx: toRad, ix: toDeg },
	level:     { tx: toLevel, ix: todB },
	px:        { tx: toPx,  ix: toRem },
	rem:       { tx: toRem, ix: toPx },
	vw:        { tx: toVw,  ix: toPx },
	vh:        { tx: toVh,  ix: toPx }
};

export const transforms = {

	contains:     contains,
	equals:       equals,
	escape:       escape,
	exp:          exp,
	formatdate:   formatDate,
	formattime:   formatTime,
	formatfloat:  toFixed,
	get:          getPath,
	invoke:       invoke,
	is:           is,

	has: function(name, object) {
		return object && (name in object);
	},

	last:         last,
	limit:        limit,
	log:          log,
	max:          max,
	min:          min,
	mod:          mod,
	not:          not,

	// Strings
	append:       append,
	prepend:      prepend,
	prepad:       prepad,
	postpad:      postpad,
	slugify:      slugify,

	// root(2) - square root
	// root(3) - cubed root, etc.
	root:         root,
	type:         toType,

	divide: function(n, value) {
		if (typeof value !== 'number') { return; }
		return value / n;
	},

	'find-in': function(path, id) {
		if (!isDefined(id)) { return; }
		var array = getPath(path, window);
		return array && array.find(compose(is(id), get('id')));
	},

	floor: Math.floor,

	"greater-than": function(value2, value1) {
		return value1 > value2;
	},

	invert: function(value) {
		return typeof value === 'number' ? 1 / value : !value ;
	},

	json: JSON.stringify,

	"less-than": function(value2, value1) {
		return value1 < value2 ;
	},

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

	lowercase: function(value) {
		if (typeof value !== 'string') { return; }
		return String.prototype.toLowerCase.apply(value);
	},

	map: function(method, params, array) {
		/*
		var tokens;

		if (params === undefined) {
			tokens = parsePipe([], method);
			fn     = createPipe(tokens, transforms);
			return function(array) {
				return array.map(fn);
			};
		}
		*/

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

	match: function(regex, string) {
		regex = typeof regex === 'string' ? RegExp(regex) : regex ;
		return regex.exec(string);
	},

	matches: function(regex, string) {
		regex = typeof regex === 'string' ? RegExp(regex) : regex ;
		return !!regex.test(string);
	},

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
			var translations = translations;

			if (!translations) {
				if (!warned.missingTranslations) {
					console.warn('Sparky: Missing lookup object Sparky.translations');
					warned.missingTranslations = true;
				}
				return value;
			}

			var text = translations[value] ;

			if (!text) {
				if (!warned[value]) {
					console.warn('Sparky: Sparky.translations contains no translation for "' + value + '"');
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
	},

	yesno: function(truthy, falsy, value) {
		return value ? truthy : falsy ;
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
