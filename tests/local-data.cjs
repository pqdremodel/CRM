const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../local-data.js'), 'utf8');
function setup(storage = new Map(), hostname = 'localhost', failWrite = false) {
    const context = {
        TextEncoder, location: { hostname }, window: {}, navigator: { locks: { request: async (_, callback) => callback() } },
        localStorage: { removeItem: key => storage.delete(key), getItem: key => storage.get(key) ?? null, setItem: (key, value) => { if (failWrite) throw new Error('Quota exceeded'); storage.set(key, value); } },
        crypto: require('node:crypto').webcrypto, document: { addEventListener() {} }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../project-template.js'), 'utf8'), context);
    vm.runInNewContext(source, context); return { client: context.window.crmLocal, storage };
}
test('local defaults persist across reloads and new projects receive independent snapshots', async () => {
    const { client, storage } = setup();
    const defaults = await client.from('project_defaults').select().eq('id', true).single();
    assert.equal(defaults.data.steps.length, 8);
    const saved = await client.from('project_defaults').update({ steps: [{ id: 's', title: 'Plan', tasks: [{ id: 't', title: 'Measure' }] }], revision: 2 }).eq('id', true).eq('revision', 1).select().single();
    assert.equal(saved.error, null);
    const reloaded = setup(storage).client;
    const created = await reloaded.from('clients').insert([{ name: 'Local test project' }]).select();
    const project = created.data[0];
    assert.equal(project.project_steps[0].tasks[0].title, 'Measure');
    const snapshot = JSON.stringify(project.project_steps);
    project.project_steps[0].tasks[0].completed = true;
    const progress = await reloaded.from('clients').update({ project_steps: project.project_steps }).eq('id', project.id).eq('project_steps', snapshot).select().single();
    assert.equal(progress.error, null);
    await reloaded.from('project_defaults').update({ steps: [], revision: 3 }).eq('id', true).eq('revision', 2).select().single();
    const again = await setup(storage).client.from('clients').select().eq('id', project.id).single();
    assert.equal(again.data.project_steps[0].tasks[0].completed, true);
    const next = await reloaded.from('clients').insert([{ name: 'Next project' }]).select();
    assert.equal(next.data[0].project_steps.length, 0);
});
test('stale revisions fail without overwriting local defaults', async () => {
    const { client } = setup();
    await client.from('project_defaults').update({ revision: 2 }).eq('revision', 1).select().single();
    const stale = await client.from('project_defaults').update({ revision: 3, steps: [] }).eq('revision', 1).select().single();
    assert.equal(stale.error.code, 'PGRST116');
    const current = await client.from('project_defaults').select().single();
    assert.equal(current.data.steps.length, 8);
});
test('storage failures are reported and corrupt storage is not overwritten', async () => {
    const quota = setup(new Map(), 'localhost', true);
    const failed = await quota.client.from('clients').insert([{ name: 'Test' }]).select();
    assert.match(failed.error.message, /Quota exceeded/);
    const storage = new Map([['pqd-crm-local-v1', 'invalid JSON']]);
    const corrupt = await setup(storage).client.from('clients').insert([{ name: 'Test' }]).select();
    assert.ok(corrupt.error);
    assert.equal(storage.get('pqd-crm-local-v1'), 'invalid JSON');
});
test('local authentication never activates on deployed hosts', () => {
    assert.equal(setup(new Map(), 'crm.example.com').client, undefined);
});
test('PDF import includes every task description and all nine complete templates', async () => {
    const { client } = setup();
    const { data } = await client.from('project_defaults').select().single();
    const tasks = data.steps.flatMap(step => step.tasks);
    assert.equal(tasks.length, 34);
    assert.ok(tasks.every(task => task.description.length > 50));
    assert.equal(tasks.filter(task => task.template).length, 9);
    assert.ok(tasks.filter(task => task.template).every(task => task.template.includes('[[FirstName]]')));
    assert.match(tasks.find(task => task.title === 'Request Contract Signature & Deposit').template, /3\.7% processing fee/);
    assert.match(tasks.find(task => task.title === 'Request Contract Signature & Deposit').template, /\$0\.49/);
});
test('one-time import backs up defaults and preserves projects and later edits', async () => {
    const oldSteps = [{ id: 'old', title: 'Old workflow', tasks: [] }];
    const storage = new Map([['pqd-crm-local-v1', JSON.stringify({ project_defaults: [{ id: true, steps: oldSteps, revision: 3 }], clients: [{ id: 'existing', project_steps: oldSteps }], profiles: [] })]]);
    const { client } = setup(storage);
    const imported = await client.from('project_defaults').select().single();
    assert.equal(imported.data.steps.length, 8);
    assert.equal(imported.data.revision, 4);
    const db = JSON.parse(storage.get('pqd-crm-local-v1'));
    assert.deepEqual(db.defaultBackups[0].defaults.steps, oldSteps);
    assert.deepEqual(db.clients[0].project_steps, oldSteps);
    await client.from('project_defaults').update({ steps: [], revision: 5 }).eq('revision', 4).select().single();
    const reopened = await setup(storage).client.from('project_defaults').select().single();
    assert.equal(reopened.data.steps.length, 0);
    assert.equal(JSON.parse(storage.get('pqd-crm-local-v1')).defaultBackups.length, 1);
});

test('projects share existing clients and retain independent procedure snapshots after reload', async () => {
    const { client, storage } = setup();
    const first = await client.from('clients').insert([{ name: 'Kitchen', project_name: 'Kitchen', address: '12 Oak St', location: '12 Oak St', price: '$15,000.00', new_client: { name: 'Alex', email: 'alex@example.test', phone: '555-0100' } }]).select();
    assert.equal(first.error, null);
    const second = await client.from('clients').insert([{ name: 'Bath', client_id: first.data[0].client_id }]).select();
    assert.equal(second.error, null);
    const reloaded = setup(storage).client;
    const contacts = await reloaded.from('client_contacts').select();
    assert.equal(contacts.data.length, 1);
    assert.equal(contacts.data[0].email, 'alex@example.test');
    const projects = await reloaded.from('clients').select();
    assert.equal(projects.data.length, 2);
    assert.equal(projects.data[0].client_id, projects.data[1].client_id);
    assert.equal(projects.data[0].new_client, undefined);
    assert.equal(projects.data[0].address, '12 Oak St');
    assert.equal(projects.data[0].project_steps.length, 8);
    await reloaded.from('clients').delete().eq('id', first.data[0].id);
    assert.equal((await reloaded.from('client_contacts').select()).data.length, 1);
});
test('invalid client references do not create projects and failed saves do not create orphan clients', async () => {
    const { client, storage } = setup();
    const invalid = await client.from('clients').insert([{ name: 'Test', client_id: 'missing' }]).select();
    assert.ok(invalid.error);
    assert.equal((await client.from('clients').select()).data.length, 0);
    const failing = setup(storage, 'localhost', true).client;
    const failed = await failing.from('clients').insert([{ name: 'Test', new_client: { name: 'Unsaved client' } }]).select();
    assert.ok(failed.error);
    assert.equal((await client.from('client_contacts').select()).data.length, 0);
});
test('legacy projects preserve their IDs and details when client links are added', async () => {
    const { client, storage } = setup();
    const original = (await client.from('clients').insert([{ name: 'Legacy client', price: '$50', location: 'Old address' }]).select()).data[0];
    const reloaded = setup(storage).client;
    const migrated = (await reloaded.from('clients').select().eq('id', original.id).single()).data;
    assert.equal(migrated.price, original.price);
    assert.equal(migrated.location, original.location);
    assert.equal(JSON.stringify(migrated.project_steps), JSON.stringify(original.project_steps));
    assert.equal(migrated.project_name, original.name);
    assert.equal(migrated.client_name, original.name);
    assert.equal((await reloaded.from('client_contacts').select()).data.length, 1);
    assert.equal((await setup(storage).client.from('client_contacts').select()).data.length, 1);
});

test('local ADMIN signs in without an email, rejects wrong passwords, and signs out', async () => {
    const { client, storage } = setup();
    assert.equal((await client.auth.getSession()).data.session, null);
    assert.ok((await client.auth.signInWithPassword({ email: 'ADMIN', password: 'wrong' })).error);
    assert.equal((await client.auth.getSession()).data.session, null);
    const result = await client.auth.signInWithPassword({ email: 'ADMIN', password: '12345' });
    assert.equal(result.error, null);
    assert.equal(result.data.user.email, undefined);
    const reload = setup(storage).client;
    assert.equal((await reload.auth.getSession()).data.session.user.username, 'ADMIN');
    assert.equal(reload.user().getDisplayName(), 'ADMIN');
    assert.equal((await reload.from('profiles').select().eq('id', 'local-admin').single()).data.role, 'admin');
    await reload.auth.signOut();
    assert.equal((await reload.auth.getSession()).data.session, null);
});
