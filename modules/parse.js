
/*
{[path|pipe:params]}

Template tags are made of three parts. Values are read from `path` in the
scope object, piped through any number of `pipe` functions, which
(depending on the pipe) may require `params`, and rendered into the DOM.

```html
<template is="sparky-template" fn="fetch:package.json">
    {[ repository.url|prepend:'Repo: '|lowercase ]}
</template>
```

```html
repo: https://github.com/cruncher/sparky.git
```

Paths are a sort-of superset of JS dot notation, where dashes and numbers are
allowed in property names:

```html
{[ items.3 ]}
{[ items.my-object ]}
```

The root path renders the scope object itself:

```html
{[ . ]}
```

And a  trailing `.` also renders the tag when the object at the path mutates:

```html
{[ items.3. ]}
{[ items.my-object. ]}
```

Sparky renders `NaN`, `null` and `undefined` as empty strings, objects as JSON,
functions as `'function(params)'`, and `Infinity` as `'∞'`. Other values
are converted to strings in the normal way.

Tags placed in an `<input :value="{[]}">` set up two-way data binding.
Sparky is strict about input types. A number will not render into an
input `type="text"`. A string will not render into an input `type="number"` or
`type="range"`.

More importantly, a number typed into an input `type="text"` will be set as
a string in the data, while the same typed into a `type="number"` will be set
as a number. Sparky gaurantees your data types.

The built-in type converter pipes facilitate rendering values into inputs of
an unmatched type.
*/

/*
src="#id"

Sparky extends `<template>` elements (and `<use>` elements in SVG) with a `src`
attribute, turning them into includes. The `src` attribute must reference
another template (or sn SVG element). Its rendered content replaces the
referring template:

```html
<template id="my-template">
    <li fn="get:keywords each">{[.]}</li>
</template>

<template is="sparky-template" fn="fetch:package.json" src="#my-template">
</template>
```

```html
<li>javascript</li>
<li>browser</li>
```

Includes may be used inside templates, too:

```html
<template is="sparky-template" fn="fetch:package.json">
    <ul>
        <template src="#my-template"></template>
    </ul>
</template>
```

```html
<ul>
    <li>javascript</li>
    <li>browser</li>
</ul>
```

The `src` attribute may contain template tags, making the included template
dependent on rendered data. This is how conditionals are written in Sparky.
Here, where there is no `keywords` property in `package.json` the template
with id `no-keywords` is rendered in place of `my-template`:

```html
<template is="sparky-template" fn="fetch:package.json">
    <ul>
        <template src="{[.keywords|yesno:#my-template,#no-keywords]}">
        </template>
    </ul>
</template>
```
*/

import { capture, exec, id, noop, nothing } from '../../fn/module.js'
import Value from './value.js';

/*
parseParams(array, string)
*/

//                                        number                                     "string"            'string'                    null   true   false    [array]      {object}   function(args)   /regex/             dot  string             comma
export const parseParams = capture(/^\s*(?:(-?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(null)|(true)|(false)|(\[[^\]]*\])|(\{[^}]*\})|(\w+)\(([^)]+)\)|\/((?:[^/]|\.)*)\/|(\.)?([\w.\-#/?:\\]+))/, {
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

    // [array]
    7: function(params, tokens) {
        params.push(JSON.parse(tokens[7]));
        return params;
    },

    // flat {object}
    8: function (params, tokens) {
        params.push(JSON.parse(tokens[8]));
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

    // /regexp/
    11: function(params, tokens) {
        const regex = RegExp(tokens[11]);
        params.push(regex);
    },

    // string
    13: function(params, tokens) {
        if (tokens[12]) {
            params.push(new Value(tokens[13]));
        }
        else {
            params.push(tokens[13]);
        }
        return params;
    },

    // Comma terminator - more params to come
    close: capture(/^\s*(,)/, {
        1: function(params, tokens) {
            parseParams(params, tokens);
        },

        catch: id
    }),

    catch: function(params, string) {
        // string is either the input string or a tokens object
        // from a higher level of parsing
        throw new SyntaxError('Invalid parameter "' + (string.input || string) + '"');
    }
});

/*
parsePipe(array, string)
*/

export const parsePipe = capture(/^\s*([\w-]+)\s*(:)?\s*/, {
    // Function name '...'
    1: function(fns, tokens) {
        fns.push({
            name: tokens[1],
            args: nothing
        });

        return fns;
    },

    // Params ':'
    2: function(fns, tokens) {
        fns[fns.length - 1].args = parseParams([], tokens);
        return fns;
    },

    close: capture(/^\s*(\|)?\s*/, {
        // More pipe '|'
        1: function(fns, tokens) {
            return parsePipe(fns, tokens);
        }
    }),

    catch: function(fns, string) {
        // string is either the input string or a tokens object
        // from a higher level of parsing
        console.log(string.input, string);
        throw new SyntaxError('Invalid pipe "' + (string.input || string) + '"');
    }
});

/*
parseTag(string)
*/

export const parseTag = capture(/^\s*([\w.-]*)\s*(\|)?\s*/, {
    // Object path 'xxxx.xxx.xx-xxx'
    1: (nothing, tokens) => new Value(tokens[1]),

    // Pipe '|'
    2: function(tag, tokens) {
        tag.pipe = parsePipe([], tokens);
        return tag;
    },

    // Tag close ']}'
    close: function(tag, tokens) {
        if (!exec(/^\s*\]\}/, id, tokens)) {
            throw new SyntaxError('Unclosed tag in "' + tokens.input + '"');
        }

        return tag;
    },

    // Where nothing is found, don't complain
    catch: id
}, undefined);

/*
parseToken(string)
*/

export const parseToken = capture(/^\s*(\{\[)/, {
    // Tag opener '{['
    1: function(unused, tokens) {
        const tag = parseTag(tokens);
        tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
        return tag;
    },

    close: function(tag, tokens) {
        // Only spaces allowed til end
        if (!exec(/^\s*$/, id, tokens)) {
            throw new SyntaxError('Invalid characters after token (only spaces valid) "' + tokens.input + '"');
        }

        return tag;
    },

    // Where nothing is found, don't complain
    catch: id
}, undefined);

/*
parseBoolean(array, string)
*/

export const parseBoolean = capture(/^\s*(?:(\{\[)|$)/, {
    // Tag opener '{['
    1: function(array, tokens) {
        const tag = parseTag(tokens);
        tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
        array.push(tag);
        return parseBoolean(array, tokens);
    },

    // Where nothing is found, don't complain
    catch: id
});

/*
parseText(array, string)
*/

export const parseText = capture(/^([\S\s]*?)(?:(\{\[)|$)/, {
    // String of text, whitespace and newlines included
    1: (array, tokens) => {
        // If no tags have been found return undefined
        if (!array.length && !tokens[2]) {
            return;
        }

        // If it is not empty, push in leading text
        if (tokens[1]) {
            array.push(tokens[1]);
        }

        return array;
    },

    // Tag opener '{['
    2: (array, tokens) => {
        const tag = parseTag(tokens);
        tag.label = tokens.input.slice(tokens.index + tokens[1].length, tokens.index + tokens[0].length + tokens.consumed);
        array.push(tag);
        return parseText(array, tokens);
    },

    // Where nothing is found, don't complain
    catch: noop
});
