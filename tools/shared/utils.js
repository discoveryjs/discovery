let printIdent = 0;
let silent = false;

function stdoutWrite(str) {
    if (!silent) {
        process.stdout.write(str);
    }
}

function print(...args) {
    stdoutWrite('  '.repeat(printIdent) + args.join(' '));
}

function println(...args) {
    print(...args.concat('\n'));
}

function sectionStart(...args) {
    println(...args);
    printIdent++;
}

function sectionEnd(...args) {
    if (args.length) {
        println(...args);
    }

    printIdent = Math.max(printIdent - 1, 0);
}

function section(name, fn) {
    sectionStart(name);
    const res = fn();

    if (res && typeof res.then === 'function') {
        return res.then(res => {
            sectionEnd();
            return res;
        });
    }

    sectionEnd();
    return res;
}

function processStep(name, fn) {
    print(name + ' ... ');
    const res = fn();

    if (res && typeof res.then === 'function') {
        return res.then(res => {
            stdoutWrite('OK\n');
            return res;
        });
    }

    stdoutWrite('OK\n');
    return res;
}

module.exports = {
    print,
    println,
    section,
    sectionStart,
    sectionEnd,
    process: processStep,
    silent: fn => {
        silent = true;
        fn();
        silent = false;
    }
};
