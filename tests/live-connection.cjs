const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('live client routes workspace tables while preserving auth, profiles and messaging', () => {
    const queried = [];
    const remote = { auth: {}, from(table) { queried.push(table); return table; } };
    const context = { window: { supabase: { createClient: () => remote } }, supabase: {}, console };
    vm.runInNewContext(fs.readFileSync('supabase.js', 'utf8'), context);
    vm.runInNewContext("supabaseClient.from('clients'); supabaseClient.from('client_contacts'); supabaseClient.from('project_defaults'); supabaseClient.from('profiles'); supabaseClient.from('messages');", context);
    assert.deepEqual(queried, ['crm_projects', 'crm_contacts', 'crm_procedure_defaults', 'profiles', 'messages']);
    assert.equal(vm.runInNewContext('supabaseClient.auth', context), remote.auth);
});
