
// A simple value wrapper object for storing dynamic values
// and their transforms

import toText from './to-text.js';

const assign = Object.assign;

export default function Value(path) {
    this.path = path;
}

export function isValue(object) {
    return Value.prototype.isPrototypeOf(object);
}

assign(Value.prototype, {
    valueOf: function valueOf() {
        return this.transform ?
            this.value === undefined ?
                undefined :
            this.transform(this.value) :
        this.value ;
    },

    toString: function toString() {
        return toText(this.valueOf());
    },
});
