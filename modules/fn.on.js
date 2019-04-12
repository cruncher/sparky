
const DEBUG = window.DEBUG;

export default function on(node, input, params) {
    const type   = params[0];
    const length = params.length - 1;

    let flag = false;
    let i = -1;
    let scope;

    const listener = (e) => {
        // Cycle through params[1] to params[-1]
        i = (i + 1) % length;

        const name = params[i + 1];

        if (DEBUG && (!scope || !scope[name])) {
            console.error('Sparky scope', scope);
            throw new Error('Sparky scope has no method "' + name + '"');
        }

        scope[name](e.target.value);
    };

    return input.tap(function(object) {
        if (!flag) {
            flag = true;

            // Keep event binding out of the critical render path by
            // delaying it
            setTimeout(() => node.addEventListener(type, listener), 10);
        }

        scope = object;
    });
}
