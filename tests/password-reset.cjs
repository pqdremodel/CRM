const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../reset-password.js'), 'utf8');
async function setup({ search = '', hash = '', session = null, requestError = null, updateError = null } = {}) {
    const elements = {};
    const element = id => elements[id] ||= {
        hidden: id === 'update-form', value: '', textContent: '', disabled: false, listeners: {},
        addEventListener(name, fn) { this.listeners[name] = fn; },
        querySelector() { return element(id + '-button'); },
        setAttribute() {}, removeAttribute() {}, reportValidity() { return true; }, focus() {}, reset() {},
    };
    let init;
    const calls = { requests: [], updates: [] };
    const auth = {
        getSession: async () => ({ data: { session } }),
        resetPasswordForEmail: async (...args) => { calls.requests.push(args); if (requestError) throw requestError; return {}; },
        updateUser: async args => { calls.updates.push(args); return { error: updateError }; },
    };
    vm.runInNewContext(source, {
        URL, URLSearchParams,
        window: { location: { search, hash, href: 'http://localhost:8080/reset-password.html' + search + hash }, history: { replaceState() {} } },
        document: { addEventListener: (_, fn) => { init = fn; }, getElementById: element, querySelector: () => element('link') },
        supabaseClient: { auth },
    });
    await init();
    const submit = async id => { element(id).listeners.submit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve)); };
    return { element, calls, submit };
}
test('requests email recovery at the correct callback URL', async () => {
    const { element, calls, submit } = await setup();
    element('reset-email').value = ' test@example.com ';
    await submit('request-form');
    assert.equal(calls.requests[0][0], 'test@example.com');
    assert.equal(calls.requests[0][1].redirectTo, 'http://localhost:8080/reset-password.html?mode=update');
    assert.equal(element('reset-success').hidden, false);
    assert.equal(element('request-form-button').disabled, false);
});
test('request failure is visible and allows retry', async () => {
    const { element, submit } = await setup({ requestError: new Error('Network unavailable') });
    await submit('request-form');
    assert.equal(element('reset-error').textContent, 'Network unavailable');
    assert.equal(element('request-form-button').disabled, false);
});
test('fetch failures explain service connectivity without claiming email was sent', async () => {
    const { element, submit } = await setup({ requestError: new TypeError('Failed to fetch') });
    await submit('request-form');
    assert.match(element('reset-error').textContent, /Unable to reach the sign-in service/);
    assert.equal(element('reset-success').hidden, true);
    assert.equal(element('request-form-button').disabled, false);
});
test('missing session and expired callback cannot show password form', async () => {
    for (const options of [{ search: '?mode=update' }, { hash: '#error=access_denied', session: {} }]) {
        const { element } = await setup(options);
        assert.equal(element('update-form').hidden, true);
        assert.equal(element('request-form').hidden, false);
        assert.match(element('reset-error').textContent, /expired/);
    }
});
test('matching passwords update the authenticated account, mismatches do not', async () => {
    const { element, calls, submit } = await setup({ search: '?mode=update', session: {} });
    assert.equal(element('update-form').hidden, false);
    element('new-password').value = 'example-password';
    element('confirm-password').value = 'different-password';
    await submit('update-form');
    assert.equal(calls.updates.length, 0);
    assert.match(element('reset-error').textContent, /do not match/);
    element('confirm-password').value = 'example-password';
    await submit('update-form');
    assert.equal(calls.updates[0].password, 'example-password');
    assert.equal(element('update-form').hidden, true);
    assert.equal(element('link').href, 'index.html');
});
test('server password policy rejection keeps form available', async () => {
    const { element, submit } = await setup({ search: '?mode=update', session: {}, updateError: new Error('Password too weak') });
    element('new-password').value = element('confirm-password').value = 'example-password';
    await submit('update-form');
    assert.equal(element('update-form').hidden, false);
    assert.equal(element('reset-error').textContent, 'Password too weak');
});
