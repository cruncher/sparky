
/** Convert values to strings suitable for rendering to the DOM */

import id       from '../../fn/modules/id.js';
import overload from '../../fn/modules/overload.js';
import toType   from '../../fn/modules/to-type.js';

// Matches the arguments list in the result of fn.toString()
const rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

export default overload(toType, {
	'boolean': function(value) {
		return value + '';
	},

	'function': function(value) {
		// Print function and parameters
		return (value.name || 'function')
			+ (rarguments.exec(value.toString()) || [])[1];
	},

	'number': function(value) {
		// Convert NaN to empty string and Infinity to ∞ symbol
		return Number.isNaN(value) ? '' :
			Number.isFinite(value) ? value + '' :
			value < 0 ? '-∞' : '∞';
	},

	'string': id,

	'symbol': function(value) {
		return value.toString();
	},

	'undefined': function() {
		return '';
	},

	'object': function(value) {
		// Don't render null
		return value ? JSON.stringify(value) : '';
	},

	'default': JSON.stringify
});
