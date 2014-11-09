
// Sparky.filters

(function(Sparky, undefined) {
	"use strict";

	var settings = (Sparky.settings = Sparky.settings || {});
	
	// A reuseable array.
	var array = [];
	
	settings.months      = ('January February March April May June July August September October November December').split(' ');
	settings.days        = ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' ');
	settings.ordinals    = (function(ordinals) {
		var array = [], n = 0;
		
		while (n++ < 31) {
			array[n] = ordinals[n] || 'th';
		}
		
		return array;
	})({
		1: 'st',
		2: 'nd',
		3: 'rd',
		21: 'st',
		22: 'nd',
		23: 'rd',
		31: 'st'
	});
	
	// This list could get huge, but it's exposed so that it
	// can be updated with problem words occuring in your project.
	settings.plurals   = ('crew sheep').split(' ');

	var log10 = Math.log10 || (function log10(n) {
	    	return Math.log(n) / Math.LN10;
	    });

	function spaces(n) {
		var s = '';
		while (n--) { s += ' ' }
		return s;
	}

	function isDefined(val) {
		return !!val || val !== undefined && val !== null && !Number.isNaN(val);
	}

	Sparky.filters = {
		add: function(value, n) {
			var result = parseFloat(value) + n ;
			if (Number.isNaN(result)) { return; }
			return result;
		},

		capfirst: function(value) {
			return value.charAt(0).toUpperCase() + string.substring(1);
		},

		cut: function(value, string) {
			return value.replace(RegExp(string, 'g'), '');
		},

		date: (function(M, F, D, l, s) {
			var formatters = {
				a: function(date) { return date.getHours() < 12 ? 'a.m.' : 'p.m.'; },
				A: function(date) { return date.getHours() < 12 ? 'AM' : 'PM'; },
				b: function(date) { return settings.months[date.getMonth()].toLowerCase().slice(0,3); },
				c: function(date) { return date.toISOString(); },
				d: function(date) { return date.getDate(); },
				D: function(date) { return settings.days[date.getDay()].slice(0,3); },
				//e: function(date) { return ; },
				//E: function(date) { return ; },
				//f: function(date) { return ; },
				F: function(date) { return settings.months[date.getMonth()]; },
				g: function(date) { return date.getHours() % 12; },
				G: function(date) { return date.getHours(); },
				h: function(date) { return ('0' + date.getHours() % 12).slice(-2); },
				H: function(date) { return ('0' + date.getHours()).slice(-2); },
				i: function(date) { return ('0' + date.getMinutes()).slice(-2); },
				//I: function(date) { return ; },
				j: function(date) { return date.getDate(); },
				l: function(date) { return settings.days[date.getDay()]; },
				//L: function(date) { return ; },
				m: function(date) { return ('0' + date.getMonth()).slice(-2); },
				M: function(date) { return settings.months[date.getMonth()].slice(0,3); },
				n: function(date) { return date.getMonth(); },
				//o: function(date) { return ; },
				O: function(date) {
					return (date.getTimezoneOffset() < 0 ? '+' : '-') +
						 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
				},
				r: function(date) { return date.toISOString(); },
				s: function(date) { return ('0' + date.getSeconds()).slice(-2); },
				S: function(date) { return settings.ordinals[date.getDate()]; },
				//t: function(date) { return ; },
				//T: function(date) { return ; },
				U: function(date) { return +date; },
				w: function(date) { return date.getDay(); },
				//W: function(date) { return ; },
				y: function(date) { return ('0' + date.getFullYear() % 100).slice(-2); },
				Y: function(date) { return date.getFullYear(); },
				//z: function(date) { return ; },
				Z: function(date) { return -date.getTimezoneOffset() * 60; }
			};
			
			var rletter = /([a-zA-Z])/g;
			
			return function formatDate(value, format) {
				if (!isDefined(value)) { return; }

				var date = value instanceof Date ? value : new Date(value) ;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1](date);
				});
			};
		})(settings),

		decibels: function(value) {
			return typeof value === 'number' && 20 * log10(value);
		},

		decimals: function(value, n) {
			return typeof value === 'number' && Number.prototype.toFixed.call(value, n);
		},

		// .default() can't work, because Sparky does not send undefined or null
		// values to be filtered. 
		//'default': function(value) {
		//	return (this === '' || this === undefined || this === null) ? value : this ;
		//},

		//dictsort
		//dictsortreversed
		//divisibleby

		escape: (function() {
			var pre = document.createElement('pre');
			var text = document.createTextNode(this);

			pre.appendChild(text);
			
			return function(value) {
				text.textContent = value;
				return pre.innerHTML;
			};
		})(),

		equal: function(value, val, string1, string2) {
			return (value === val ? string1 : string2) || '';
		},

		//filesizeformat

		first: function(value) {
			return value[0];
		},

		floatformat: function(value, n) {
			return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
				!isDefined(value) ? '' :
				(Sparky.debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
		},

		get: function(value, name) {
			return value[name];
		},

		//get_digit
		//iriencode

		join: function(value) {
			return Array.prototype.join.apply(value);
		},

		json: function(value) {
			return JSON.stringify(value);
		},

		last: function(value) {
			return value[value.length - 1];
		},

		length: function(value) {
			return value.length;
		},

		//length_is
		//linebreaks

		linebreaksbr: (function() {
			var rbreaks = /\n/;
			
			return function(value) {
				return value.replace(rbreaks, '<br/>')
			};
		})(),

		//linenumbers

		lower: function(value) {
			String.prototype.toLowerCase.apply(value);
		},

		lowercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toLowerCase.apply(value);
		},

		//make_list 

		multiply: function(value, n) {
			return value * n;
		},

		parseint: function(value) {
			return parseInt(value, 10);
		},

		percent: function(value) {
			return value * 100;
		},

		//phone2numeric

		pluralize: function(value, str1, str2, lang) {
			if (settings.plurals.indexOf(value) !== -1) { return value; }

			str1 = str1 || '';
			str2 = str2 || 's';

			if (lang === 'fr') {
				return value < 2 ? str1 : str2;
			}
			else {
				return value === 1 ? str1 : str2;
			}
		},

		//pprint

		prepad: function(value, n, char) {
			if (!isDefined(value)) { return ''; }

			var string = value.toString();
			var l = string.length;

			// String is longer then padding: let it through unprocessed
			if (n - l < 1) { return value; }

			array.length = 0;
			array.length = n - l;
			array.push(string);
			return array.join(char || ' ');
		},

		postpad: function(value, n) {
			if (!isDefined(value)) { return ''; }

			var string = value.toString();
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? value :
				m > l ? string + spaces(m-l) :
				string.substring(0, m) ;
		},

		random: function(value) {
			return value[Math.floor(Math.random() * value.length)];
		},
		
		//raw
		//removetags
		
		replace: function(value, str1, str2) {
			return value.replace(RegExp(str1, 'g'), str2);
		},
		
		//reverse

		safe: function(string) {
			if (typeof string !== string) { return; }
			// Actually, we can't do this here, because we cant return DOM nodes
			return;
		},

		//safeseq

		slice: function(value) {
			return Array.prototype.slice.apply(value);
		},

		slugify: function(value) {
			if (typeof value !== 'string') { return; }
			return value.trim().toLowerCase().replace(/\W/g, '-').replace(/[_]/g, '-');
		},

		//sort
		//stringformat

		striptags: (function() {
			var rtag = /<(?:[^>'"]|"[^"]*"|'[^']*')*>/g;
			
			return function(value) {
				return value.replace(rtag, '');
			};
		})(),
		
		striptagsexcept: (function() {
			var rtag = /<(\/)?(\w*)(?:[^>'"]|"[^"]*"|'[^']*')*>/g,
			    allowedTags, result;
			
			function strip($0, $1, $2) {
				// Strip any attributes, letting the allowed tag name through.
				return $2 && allowedTags.indexOf($2) !== -1 ?
					'<' + ($1 || '') + $2 + '>' :
					'' ;
			}
			
			return function(value, tags) {
				if (!tags) {
					return value.replace(rtag, '');
				}
				
				allowedTags = tags.split(' ');
				result = value.replace(rtag, strip);
				allowedTags = false;

				return result;
			};
		})(),

		symbolise: function(value) {
			// Takes infinity values and convert them to infinity symbol
			var string = value + '';
			var infinity = Infinity + '';
			
			if (string === infinity) {
				return '∞';
			}

			if (string === ('-' + infinity)) {
				return '-∞';
			}

			return value;
		},

		time: function() {
			
		},

		//timesince
		//timeuntil
		//title

		truncatechars: function(value, n) {
			return value.length > n ?
				value.length.slice(0, n) + '&hellips;' :
				value ;
		},

		//truncatewords
		//truncatewords_html
		//unique
		
		unordered_list: function(value) {
			// TODO: Django supports nested lists. 
			var list = value,
			    length = list.length,
			    i = -1,
			    html = '';
			
			while (++i < length) {
				html += '<li>';
				html += list[i];
				html += '</li>';
			}
			
			return html;
		},

		//urlencode
		//urlize
		//urlizetrunc
		//wordcount
		//wordwrap

		yesno: function(value, truthy, falsy) {
			return value ? truthy : falsy ;
		}
	};
})(window.Sparky || require('sparky'));
