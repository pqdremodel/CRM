const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ctx = { document: { addEventListener() {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../workspace-backup.js'), 'utf8'), ctx);
const template = fs.readFileSync(path.join(__dirname, '../supabase/imports/upload-local-workspace.sql'), 'utf8');
test('SQL export preserves data and escapes dollar quote boundaries in user content', () => {
    const data = { clients: [{ id: '1', notes: "O'Brien $pqd_local_backup$ $pqd_import$ $pqd_backup_0$ $$ $&" }], project_defaults: [{ steps: [{ tasks: [{ completed: true, template: 'Subject: Hello\nWorld' }] }] }], client_contacts: [] };
    const sql = ctx.buildWorkspaceSQL(template, data);
    const payload = sql.match(/workspace jsonb := (\$pqd_backup_\d+\$)\n([\s\S]*?)\n\1::jsonb/);
    assert.ok(payload);
    assert.deepEqual(JSON.parse(payload[2]), data);
    assert.ok(sql.includes('do $pqd_block_1$'));
    assert.ok(!sql.includes('REPLACE_THIS_WITH_YOUR_EXPORTED_LOCAL_DATA'));
});
test('SQL export rejects invalid workspace or missing template', () => {
    assert.throws(() => ctx.buildWorkspaceSQL(template, {}), /incomplete/);
    assert.throws(() => ctx.buildWorkspaceSQL('', { clients: [], project_defaults: [] }), /template/);
});
