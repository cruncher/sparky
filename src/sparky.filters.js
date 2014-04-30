
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
	
	Sparky.filters = {
		add: function(n) {
			return parseFloat(this) + n ;
		},

		capfirst: function() {
			return this.charAt(0).toUpperCase() + string.substring(1);
		},

		cut: function(string) {
			return this.replace(RegExp(string, 'g'), '');
		},

		prepad: function(n) {
			var string = this.toString();
			var l = string.length;
			array.length = 0;
			array.length = n - l;
			array.push(string);
			return l < n ? array.join(' ') : this ;
		},

		postpad: function(n) {
			var string = this.toString();
			var l = string.length;
			array.length = 0;
			array.push(string);
			array.length = n - l;
			return l < n ? array.join(' ') : this ;
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
			
			return function date(format) {
				var date = this instanceof Date ? this : new Date(this) ;
				
				return format.replace(rletter, function($0, $1) {
					return formatters[$1](date);
				});
			};
		})(settings),
		
		decimals: Number.prototype.toFixed,
		
		'default': function(value) {
			return (this === undefined || this === null) ? value : this ;
		},
		
		//dictsort
		//dictsortreversed
		//divisibleby

		escape: (function() {
			var pre = document.createElement('pre');
			var text = document.createTextNode(this);

			pre.appendChild(text);
			
			return function() {
				text.textContent = this;
				return pre.innerHTML;
			};
		})(),

		//filesizeformat

		first: function() {
			return this[0];
		},

		floatformat: Number.prototype.toFixed,

		//get_digit
		//iriencode

		join: Array.prototype.join,

		json: function() {
			return JSON.stringify(this);
		},

		last: function() {
			return this[this.length - 1];
		},

		length: function() {
			return this.length;
		},

		//length_is
		//linebreaks

		linebreaksbr: (function() {
			var rbreaks = /\n/;
			
			return function() {
				return this.replace(rbreaks, '<br/>')
			};
		})(),

		//linenumbers

		lower: String.prototype.toLowerCase,
		lowercase: String.prototype.toLowerCase,
		
		//make_list 
		
		multiply: function(n) {
			return this * n;
		},
		
		parseint: function() {
			return parseInt(this, 10);
		},
		
		//phone2numeric

		pluralize: function() {
			return this + (this > 1 ? 's' : '') ;
		},

		//pprint

		random: function() {
			return this[Math.floor(Math.random() * this.length)];
		},
		
		//raw
		//removetags
		
		replace: function(str1, str2) {
			return this.replace(RegExp(str1, 'g'), str2);
		},
		
		//reverse

		safe: function() {
			
		},

		//safeseq

		slice: Array.prototype.slice,
		
		slugify: function() {
			return this.trim().toLowerCase.replace(/\W/g, '').replace(/_/g, '-');
		},

		//sort
		//stringformat

		striptags: (function() {
			var rtag = /<(?:[^>'"]|"[^"]*"|'[^']*')*>/g;
			
			return function() {
				return this.replace(rtag, '');
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
			
			return function(tags) {
				if (!tags) {
					return this.replace(rtag, '');
				}
				
				allowedTags = tags.split(' ');
				result = this.replace(rtag, strip);
				allowedTags = false;

				return result;
			};
		})(),

		time: function() {
			
		},

		//timesince
		//timeuntil
		//title

		truncatechars: function(n) {
			return this.length > n ?
				this.length.slice(0, n) + '&hellips;' :
				this ;
		},

		//truncatewords
		//truncatewords_html
		//unique
		
		unordered_list: function() {
			// TODO: Django supports nested lists. 
			var list = this,
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

		yesno: function(truthy, falsy) {
			return this ? truthy : falsy ;
		}
	};
})(window.Sparky || require('sparky'));