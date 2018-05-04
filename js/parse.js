
import parse from '../../fn/modules/parse.js'
import { nothing, pipe } from '../../fn/fn.js'


/* Parse parameters */

const parseArrayClose = parse(/^\]\s*/, nothing);

//                                        number                                     "string"                   'string'                    null   true   false    array function(args)   string
export const parseParams = parse(/^\s*(?:(-?(?:\d+|\d+\.\d+|\.\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(null)|(true)|(false)|(\[)|(\w+)\(([^)]+)\)|([^,\s\]]+))\s*(,)?\s*/, {
    // number
    1: function(params, value) { params.push(parseFloat(value)); return params; },

    // "string"
    2: function(params, value) { params.push(value); return params; },

    // 'string'
    3: function(params, value) { params.push(value); return params; },

    // null
    4: function(params) { params.push(null); return params; },

    // true
    5: function(params) { params.push(true); return params; },

    // false
    6: function(params) { params.push(false); return params; },

    // array
    7: function(params, value, data) {
        params.push(parseParams([], data));
        parseArrayClose(null, data);
        return params;
    },

    // Todo: review syntax for nested functions
    // function(args)
    //8: function(params, value, result) {
    //    // Todo: recurse to parseFn for parsing inner functions
    //    value = Sparky.transforms[value].apply(null, JSON.parse('[' + result[9].replace(rsinglequotes, '"') + ']'));
    //    params.push(value);
    //    return params;
    //},

    // string
    10: function(params, value) { params.push(value); return params; },

    // Comma terminator - more params to come
    11: function(params, value, data) {
        return parseParams(params, data);
    }
});


/* Parse function */

export const parseFn = parse(/^([\w-]+)\s*(:)?\s*/, {
    1: function(getFn, name) {
        var fn = getFn(name);
        if (!fn) { throw new Error('fn ' + name + '() not found.'); }
        return fn;
    },

    2: function(fn, value, data) {
        return fn.apply(null, parseParams([], data));
    }
});


/* Parse pipe */


import { transformers, transforms } from './transforms.js';

function getFn(name) {
    return transformers[name] ? transformers[name].tx : transforms[name] ;
}

const parsePipe1 = parse(/^(\|)?\s*/, {
    1: function(array, value, data) {
        array.push(parseFn(getFn, data));
        parsePipe1(array, data);
        return array;
    }
});

export function parsePipe(string) {
    var data = typeof string === 'string' ? {
        0: '',
        input: string,
        index: 0
    } : string ;

    var array = [];

    array.push(parseFn(getFn, data));
    parsePipe1(array, data);

    // No need to pipe if there is but one function
    return array.length > 1 ?
        pipe.apply(null, array) :
        array[0] ;
}


/* Parse tag */

export const parseTag = parse(/\{\[\s*([^|\s]*)\s*(\|)?\s*/, {
    1: function(object, path) {
        object.path = path;
        return object;
    },

    2: function(object, symbol, data) {
        object.fn = parsePipe(data);
        return object;
    },

    close: parse(/^\s*\]\}/, nothing)
});
