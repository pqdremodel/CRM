// Shared by the download UI and export validation tests.
function buildWorkspaceSQL(template, workspace) {
    const json = JSON.stringify(workspace, null, 2);
    if (!Array.isArray(workspace.clients) || !Array.isArray(workspace.project_defaults)) {
        throw new Error('The local workspace is incomplete. No file was generated.');
    }
    // Neither PostgreSQL dollar-quote boundary may occur in exported user text.
    let suffix = 0;
    while (json.includes(`$pqd_backup_${suffix}$`) || json.includes(`$pqd_block_${suffix}$`)) suffix++;
    const placeholder = '{"REPLACE_THIS_WITH_YOUR_EXPORTED_LOCAL_DATA": true}';
    if (!template.includes(placeholder)) throw new Error('The SQL template could not be prepared.');
    return template
        .replaceAll('$pqd_local_backup$', `$pqd_backup_${suffix}$`)
        .replaceAll('$pqd_import$', `$pqd_block_${suffix}$`)
        .replace(placeholder, () => json)
        .replace('-- Replace ONLY the JSON between', '-- Data is already included. Do not replace the JSON between');
}
document.addEventListener('app:init', () => {
    if (!window.crmLocal) return;
    document.getElementById('local-backup-card').hidden = false;
    const status = document.getElementById('local-backup-status');
    const buttons = ['download-local-backup', 'download-local-sql'].map(id => document.getElementById(id));
    async function download(sql) {
        buttons.forEach(button => button.disabled = true);
        status.textContent = 'Preparing your download…';
        try {
            const workspace = await window.crmLocal.exportWorkspace();
            let content = JSON.stringify(workspace, null, 2);
            if (sql) {
                const response = await fetch('supabase/imports/upload-local-workspace.sql', { cache: 'no-store' });
                if (!response.ok) throw new Error('Could not load the SQL template. Try again while the local server is running.');
                content = buildWorkspaceSQL(await response.text(), workspace);
            }
            const blob = new Blob([content], { type: sql ? 'application/sql;charset=utf-8' : 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pqd-workspace-${new Date().toISOString().replace(/[:.]/g, '-')}.${sql ? 'sql' : 'json'}`;
            document.body.append(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            status.textContent = sql
                ? 'SQL file downloaded. Open it, copy its contents into Supabase → SQL Editor, and click Run. Your local data is unchanged.'
                : 'Backup downloaded. Keep this JSON file somewhere safe. Your local data is unchanged.';
        } catch (error) { status.textContent = 'Download failed. ' + error.message; }
        finally { buttons.forEach(button => button.disabled = false); }
    }
    buttons[0].addEventListener('click', () => download(false));
    buttons[1].addEventListener('click', () => download(true));
}, { once: true });
