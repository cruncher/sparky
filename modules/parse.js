
import { capture, exec, id, noop, nothing, pipe } from '../../fn/fn.js'
import toRenderString from './render.js';

const assign          = Object.assign;
const parseArrayClose = capture(/^\]\s*/, nothing);

//                                        number                                     "string"                   'string'                    null   true   false  array function(args)   string      comma
export const parseParams = capture(/^\s*(?:(-?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(null)|(true)|(false)|(\[)|(\w+)\(([^)]+)\)|([\w.\-#/?:\\]+))\s*(,)?\s*/, {
    // number
    1: function(params, tokens) {
        params.push(parseFloat(tokens[1]));
        return params;
    },

    // "string"
    2: function(params, tokens) {
        params.push(tokens[2]);
        return params;
    },

    // 'string'
    3: function(params, tokens) {
        params.push(tokens[3]);
        return params;
    },

    // null
    4: function(params) {
        params.push(null);
        return params;
    },

    // true
    5: function(params) {
        params.push(true);
        return params;
    },

    // false
    6: function(params) {
        params.push(false);
        return params;
    },

    // array
    7: function(params, tokens) {
        if (tokens.input[1] === ']') {
            params.push([]);
        }
        else {
            params.push(parseParams([], tokens));
        }

        parseArrayClose(null, tokens);
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
    10: function(params, tokens) {
        params.push(tokens[10]);
        return params;
    },

    // Comma terminator - more params to come
    11: function(params, tokens) {
        return parseParams(params, tokens);
    }
});









/* Parse function */

import { transformers, transforms } from './transforms.js';

function getTransform(name) {
    return transformers[name] ?
        transformers[name].tx :
        transforms[name] ;
}

export const parsePipe = capture(/^\s*([\w-]+)\s*(:)?\s*/, {
    // Function name '...'
    1: function(fns, tokens) {
        const fn = getTransform(tokens[1]);
        if (!fn) { throw new Error('fn ' + tokens[1] + '() not found.'); }
        fns.push(fn);
        return fns;
    },

    // Params ':'
    2: function(fns, tokens) {
        const params = parseParams([], tokens);
        fns[fns.length - 1] = fns[fns.length - 1].apply(null, params);
        return fns;
    },

    close: capture(/^\s*(\|)?\s*/, {
        // More pipe '|'
        1: function(fns, tokens) {
            return parsePipe(fns, tokens);
        }
    })
})

function Tag() {}

assign(Tag.prototype, {
    pipe: id,

    toString: function toString() {
        // Don't pipe undefined
        return toRenderString(
            this.value === undefined || this.value === null ?
                undefined :
                this.pipe(this.value)
        );
    },

    valueOf: function valueOf() {
        // Don't pipe undefined
        return this.value === undefined || this.value === null ?
            undefined :
            this.pipe(this.value) ;
    }
});

export const parseTag = capture(/^\s*([\w.-]*)\s*(\|)?\s*/, {
    // Object path 'xxxx.xxx.xx-xxx'
    1: (data, tokens) => {
        data.path = tokens[1];
        return data;
    },

    // Pipe '|'
    2: function(data, tokens) {
        const fns = parsePipe([], tokens);
        data.pipe = pipe.apply(null, fns);
        return data;
    },

    // Tag close ']}'
    close: function(data, tokens) {
        exec(/^\s*\]\}/, noop, tokens);
        return data;
    }
});

export const parseBoolean = capture(/^\s*(?:(\{\[)|$)/, {
    // Tag opener '{['
    1: function(data, tokens) {
        const tag = parseTag(new Tag(), tokens);
        tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
        data.push(tag);
        return parseBoolean(data, tokens);
    }
});

export const parseText = capture(/^([\S\s]*?)(?:(\{\[)|$)/, {
    // String of text, whitespace and newlines included '...'
    1: (data, tokens) => {
        // If it exists, push in the leading text
        if (tokens[1]) {
            data.push(tokens[1]);
        }
        return data;
    },

    // Tag opener '{['
    2: function(data, tokens) {
        const tag = parseTag(new Tag(), tokens);
        tag.label = tokens.input.slice(tokens.index + tokens[1].length, tokens.index + tokens[0].length + tokens.consumed);
        data.push(tag);
        return parseText(data, tokens);
    }
});
