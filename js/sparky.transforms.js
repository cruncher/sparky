
// Sparky.filter

(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var dom       = window.dom;
	var Sparky    = window.Sparky;

	var A         = Array.prototype;
	var assign    = Object.assign;
	var curry     = Fn.curry;
	var get       = Fn.get;
	var isDefined = Fn.isDefined;
	var last      = Fn.last;
	var formatDate = Fn.formatDate;

	function spaces(n) {
		var s = '';
		while (n--) { s += ' '; }
		return s;
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

	assign(Sparky.transformers = {}, {
		add:         {
			tx: curry(function(a, b) { return b.add ? b.add(a) : b + a ; }),
			ix: curry(function(a, c) { return c.add ? c.add(-a) : c - a ; })
		},

		'add-date':  { tx: Fn.addDate,     ix: Fn.subDate },
		'add-time':  { tx: Fn.addTime,     ix: Fn.subTime },
		decibels:    { tx: Fn.todB,        ix: Fn.toLevel },
		multiply:    { tx: Fn.multiply,    ix: curry(function(d, n) { return n / d; }) },
		degrees:     { tx: Fn.toDeg,       ix: Fn.toRad },
		radians:     { tx: Fn.toRad,       ix: Fn.toDeg },
		pow:         { tx: Fn.pow,         ix: curry(function(n, x) { return Fn.pow(1/n, x); }) },
		exp:         { tx: Fn.exp,         ix: Fn.log },
		log:         { tx: Fn.log,         ix: Fn.exp },
		int:         { tx: Fn.toFixed(0),  ix: Fn.toInt },
		float:       { tx: Fn.toFloat,     ix: Fn.toString },
		boolean:     { tx: Boolean,        ix: Fn.toString },
		normalise:   { tx: Fn.normalise,   ix: Fn.denormalise },
		denormalise: { tx: Fn.denormalise, ix: Fn.normalise },
		floatformat: { tx: Fn.toFixed,     ix: curry(function(n, str) { return parseFloat(str); }) },

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
		}
	});

	assign(Sparky.transforms, {

		// Transforms from Fn's map functions

		append:       Fn.append,
		contains:     Fn.contains,
		diff:         Fn.diff,
		equals:       Fn.equals,
		//exp:          Fn.exp,
		factorise:    Fn.factorise,
		formatdate:   Fn.formatDate,
		formattime:   Fn.formatTime,
		gcd:          Fn.gcd,
		get:          Fn.get,
		getPath:      Fn.getPath,
		intersect:    Fn.intersect,
		invoke:       Fn.invoke,
		is:           Fn.is,
		lcm:          Fn.lcm,
		limit:        Fn.limit,
		//log:          Fn.log,
		max:          Fn.max,
		min:          Fn.min,
		mod:          Fn.mod,
		not:          Fn.not,
		percent:      Fn.multiply(100),
		prepend:      Fn.prepend,
		rest:         Fn.rest,
		root:         Fn.nthRoot,
		slugify:      Fn.slugify,
		sort:         Fn.sort,
		take:         Fn.take,
		toCartesian:  Fn.toCartesian,
		todB:         Fn.todB,
		decibels:     Fn.todB,
		toDeg:        Fn.toDeg,
		toLevel:      Fn.toLevel,
		toPolar:      Fn.toPolar,
		toRad:        Fn.toRad,
		toStringType: Fn.toStringType,
		typeof:       Fn.toType,
		unique:       Fn.unique,
		unite:        Fn.unite,

		// Transforms from dom's map functions

		escape:       dom.escape,
		px:           dom.toPx,
		rem:          dom.toRem,


		// Sparky transforms

		timeformat: function timeformat(format, timezone, locale) {
			locale = locale || document.documentElement.lang;

			return function(date) {
				// Todo: Deprecated: Time objects
				if (date instanceof Time) {
					console.log('Sparky: deprecated Time objects in timeformat transform. Also, use formattime.');
					return date.render(format, locale);
				}

				return formatDate(format, timezone, locale, date);
			};
		},

		divide: curry(function(n, value) {
			if (typeof value !== 'number') { return; }
			return value / n;
		}),

		'find-in': curry(function(path, id) {
			if (!isDefined(id)) { return; }
			var collection = Fn.getPath(path, Sparky.data);
			return collection && collection.find(id);
		}),

		first: Fn.get(0),

		floatformat: curry(function(n, value) {
			return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
				!isDefined(value) ? '' :
				(Sparky.debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
		}),

		floor: function(value) {
			return Math.floor(value);
		},

		"greater-than": curry(function(value2, value1) {
			return value1 > value2;
		}),

		invert: function(value) {
			return typeof value === 'number' ? 1 / value : !value ;
		},

		join: curry(function(string, value) {
			return Array.prototype.join.call(value, string);
		}),

		json: function(value) {
			return JSON.stringify(value);
		},

		last: function(value) {
			return value[value.length - 1];
		},

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

		map: curry(function(method, args, array) {
			return array && array.map(Sparky.transforms[method].apply(null,args));
		}, true),

		filter: curry(function(method, args, array) {
			return array && array.map(Sparky.transforms[method].apply(null,args));
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

		// TODO: these should copy postpadding and preppadding from Fn

		postpad: curry(function(n, value) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? value :
				m > l ? string + spaces(m - l) :
				string.substring(0, m) ;
		}),

		prepad: curry(function(n, char, value) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var array = [];

			// String is longer then padding: let it through unprocessed
			if (n - l < 1) { return value; }

			array.length = 0;
			array.length = n - l;
			array.push(string);
			return array.join(char || ' ');
		}),

		random: function(value) {
			return value[Math.floor(Math.random() * value.length)];
		},

		reduce: curry(function(name, initialValue, array) {
			return array && array.reduce(Fn[name], initialValue || 0);
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
			if (typeof value === 'string') { value = parseInt(value, 10); }
			if (typeof value !== 'number' || Number.isNaN(value)) { return; }
			return arguments[value + 1];
		},

		translate: (function() {
			var warned = {};

			return function(value) {
				var translations = Sparky.translations;

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

		type: function(value) {
			return typeof value;
		},

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
	});
})(this);
