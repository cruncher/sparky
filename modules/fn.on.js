
export default function on(node, input, params) {
    const type   = params[0];
    const length = params.length - 1;

    let flag = false;
    let i = -1;
    let scope;

    const listener = (e) => {
        // Cycle through params[1] to last param
        i = (i + 1) % length;
        scope && scope[params[i + 1]](e.target.value);
    };

    return input.tap(function(object) {
        if (!flag) {
            flag = true;

            // Keep event binding out of the critical render path by
            // delaying it
            setTimeout(() => node.addEventListener(type, listener), 50);
        }

        scope = object;
    });
}
