
import {
	add,
	append,
	curry,
	contains,
	compose,
	equals,
	formatDate,
	formatTime,
	get,
	getPath,
	invoke,
	is,
	isDefined,
	last,
	limit,
	addDate,
	addTime,
	subTime,
	max,
	min,
	mod,
	multiply,
	not,
	pow,
	postpad,
	prepad,
	prepend,
	exp,
	log,
	root,
	slugify,
	toCamelCase,
	toCartesian,
	toPolar,
	toDeg,
	toRad,
	toLevel,
	todB,
	toInt,
	toFloat,
	toFixed,
	toString,
	toType
} from '../../fn/module.js';

import * as normalise   from '../../fn/modules/normalisers.js';
import * as denormalise from '../../fn/modules/denormalisers.js';

import {
	escape,
	toPx,
	toRem,
	parse
} from '../../dom/module.js';

var debug     = true;
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
		tx: curry(function(a, b) { return b.add ? b.add(a) : b + a ; }),
		ix: curry(function(a, c) { return c.add ? c.add(-a) : c - a ; })
	},

	'add-date':  { tx: addDate,     ix: curry(function(d, n) { return addDate('-' + d, n); }) },
	'add-time':  { tx: addTime,     ix: subTime },
	'to-db':     { tx: todB,        ix: toLevel },

	'to-precision': {
		tx: curry(function(n, value) {
			return Number.isFinite(value) ?
				value.toPrecision(n) :
				value ;
		}),

		ix: parseFloat
	},

	join: {
		tx: curry(function(string, value) {
			return A.join.call(value, string);
		}),

		ix: curry(function(string, value) {
			return S.split.call(value, string);
		})
	},

	'numbers-string': {
		tx: curry(function(string, value) {
			return A.join.call(value, string);
		}),

		ix: curry(function(string, value) {
			return S.split.call(value, string).map(parseFloat);
		})
	},

	multiply:    { tx: multiply,    ix: curry(function(d, n) { return n / d; }) },
	degrees:     { tx: toDeg,       ix: toRad },
	radians:     { tx: toRad,       ix: toDeg },
	pow:         { tx: pow,         ix: function(n) { return pow(1/n); } },
	exp:         { tx: exp,         ix: log },
	log:         { tx: log,         ix: exp },
	int:         { tx: toFixed(0),  ix: toInt },
	float:       { tx: toFloat,     ix: toString },
	boolean:     { tx: Boolean,     ix: toString },

	normalise:   {
		tx: curry(function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return normalise[name](min, max, number);
		}),

		ix: curry(function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return denormalise[name](min, max, number);
		})
	},

	denormalise:   {
		tx: curry(function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return denormalise[name](min, max, number);
		}),

		ix: curry(function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return normalise[name](min, max, number);
		})
	},

	floatformat: { tx: toFixed,     ix: curry(function(n, str) { return parseFloat(str); }) },
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
	px:        { tx: toPx, ix: toRem },
	rem:       { tx: toRem, ix: toPx }
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

    has: curry(function(name, object) {
        return object && (name in object);
    }),

	last:         last,
	limit:        limit,
	log:          log,
	max:          max,
	min:          min,
	mod:          mod,
	not:          not,
	percent:      multiply(100),

	// Strings
	append:       append,
	prepend:      prepend,
	prepad:       prepad,
	postpad:      postpad,
	slugify:      slugify,

	// root(2) - square root
	// root(3) - cubed root, etc.
	root:         root,

	// slugify('Howdy, Michael')
	// > 'howdy-michael'

	type:         toType,

	//toStringType: Fn.toStringType,

	// Sparky transforms

	divide: curry(function(n, value) {
		if (typeof value !== 'number') { return; }
		return value / n;
	}),

	'find-in': curry(function(path, id) {
		if (!isDefined(id)) { return; }
		var array = getPath(path, window);
		return array && array.find(compose(is(id), get('id')));
	}),

	floatformat: curry(function(n, value) {
		return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
			!isDefined(value) ? '' :
			(debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
	}),

	floor: Math.floor,

	"greater-than": curry(function(value2, value1) {
		return value1 > value2;
	}),

	invert: function(value) {
		return typeof value === 'number' ? 1 / value : !value ;
	},

	json: JSON.stringify,

	"less-than": curry(function(value2, value1) {
		return value1 < value2 ;
	}),

	localise: curry(function(digits, value) {
		var locale = document.documentElement.lang;
		var options = {};

		if (isDefined(digits)) {
			options.minimumFractionDigits = digits;
			options.maximumFractionDigits = digits;
		}

		// Todo: localise value where toLocaleString not supported
		return value.toLocaleString ? value.toLocaleString(locale, options) : value ;
	}),

	lowercase: function(value) {
		if (typeof value !== 'string') { return; }
		return String.prototype.toLowerCase.apply(value);
	},

	map: function(method, params) {
		var fn;

		if (typeof params === undefined) {
			fn = parse(method);
			return function(array) {
				return array.map(fn);
			};
		}

		fn = ((transformers[method] && transformers[method].tx)
			|| transforms[method]).apply(null, params);

		return function(array) {
			return array && array.map(fn);
		};
	},

	filter: curry(function(method, args, array) {
		return array && array.map(transforms[method].apply(null,args));
	}, true),

	match: curry(function(regex, string) {
		regex = typeof regex === 'string' ? RegExp(regex) : regex ;
		return regex.exec(string);
	}),

	matches: curry(function(regex, string) {
		regex = typeof regex === 'string' ? RegExp(regex) : regex ;
		return !!regex.test(string);
	}),

	pluralise: curry(function(str1, str2, lang, value) {
		if (typeof value !== 'number') { return; }

		str1 = str1 || '';
		str2 = str2 || 's';

		// In French, numbers less than 2 are considered singular, where in
		// English, Italian and elsewhere only 1 is singular.
		return lang === 'fr' ?
			(value < 2 && value >= 0) ? str1 : str2 :
			value === 1 ? str1 : str2 ;
	}),

	reduce: curry(function(name, initialValue, array) {
		return array && array.reduce(reducers[name], initialValue || 0);
	}, true),

	replace: curry(function(str1, str2, value) {
		if (typeof value !== 'string') { return; }
		return value.replace(RegExp(str1, 'g'), str2);
	}),

	round: curry(function round(n, value) {
		return Math.round(value / n) * n;
	}),

	slice: curry(function(i0, i1, value) {
		return typeof value === 'string' ?
			value.slice(i0, i1) :
			Array.prototype.slice.call(value, i0, i1) ;
	}, true),

	striptags: (function() {
		var rtag = /<(?:[^>'"]|"[^"]*"|'[^']*')*>/g;

		return function(value) {
			return value.replace(rtag, '');
		};
	})(),

	switch: function(value) {
		if (typeof value === 'boolean') { value = Number(value); }
		if (typeof value === 'string') { value = parseInt(value, 10); }
		if (typeof value !== 'number' || Number.isNaN(value)) { return; }
		return arguments[value + 1];
	},

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

	truncatechars: curry(function(n, value) {
		return value.length > n ?
			value.slice(0, n) + '…' :
			value ;
	}),

	uppercase: function(value) {
		if (typeof value !== 'string') { return; }
		return String.prototype.toUpperCase.apply(value);
	},

	//urlencode
	//urlize
	//urlizetrunc
	//wordcount
	//wordwrap

	yesno: curry(function(truthy, falsy, value) {
		return value ? truthy : falsy ;
	})
};
