// Local development only. Set enabled to false when connecting these pages to Supabase.
(() => {
    const enabled = true;
    if (!enabled || !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return;
    const key = 'pqd-crm-local-v1';
    const source = window.CRM_PRECONSTRUCTION_DEFAULTS;
    const initialSteps = source.steps;
    const profile = { id: 'local-user', first_name: 'Local', last_name: 'Workspace', email: 'local@example.test' };
    function read() {
        const raw = localStorage.getItem(key);
        return raw === null ? { importedTemplate: source.version, project_defaults: [{ id: true, steps: initialSteps, revision: 1 }], clients: [], profiles: [profile] } : JSON.parse(raw);
    }
    function write(data) { localStorage.setItem(key, JSON.stringify(data)); }
    const clone = value => JSON.parse(JSON.stringify(value));
    function from(table) {
        let operation = 'select', payload, filters = [], sort, single = false, promise;
        const query = {
            select() { return query; },
            insert(value) { operation = 'insert'; payload = value; return query; },
            update(value) { operation = 'update'; payload = value; return query; },
            delete() { operation = 'delete'; return query; },
            eq(field, value) { filters.push(row => typeof row[field] === 'object' && row[field] !== null ? JSON.stringify(row[field]) === value : row[field] === value); return query; },
            is(field, value) { filters.push(row => row[field] === value); return query; },
            order(field, options) { sort = { field, ascending: options.ascending }; return query; },
            single() { single = true; return query; },
            then(resolve, reject) {
                // Web Locks serialize read-modify-write operations across local tabs.
                if (!promise) promise = navigator.locks.request(key, () => {
                    try {
                        const db = read();
                        if (db.importedTemplate !== source.version) {
                            // One-time requested replacement; keep a recoverable copy of previous defaults.
                            db.defaultBackups = db.defaultBackups || [];
                            db.defaultBackups.push({ savedAt: new Date().toISOString(), defaults: clone(db.project_defaults[0]) });
                            db.project_defaults[0] = { id: true, steps: clone(initialSteps), revision: db.project_defaults[0].revision + 1 };
                            db.importedTemplate = source.version;
                            write(db);
                        }
                        // Keep legacy project records intact and give each an independent client link.
                        let migrated = false;
                        if (!db.client_contacts) { db.client_contacts = []; migrated = true; }
                        for (const project of db.clients) {
                            if (project.client_id) continue;
                            const contact = { id: crypto.randomUUID(), name: project.name || 'Unnamed client', email: '', phone: '' };
                            db.client_contacts.push(contact);
                            project.client_id = contact.id;
                            project.client_name = contact.name;
                            project.project_name = project.project_name || project.name;
                            migrated = true;
                        }
                        if (migrated) write(db);
                        if (!['project_defaults', 'clients', 'client_contacts', 'profiles'].includes(table)) throw new Error('This feature is not available in the local workspace.');
                        let rows = db[table].filter(row => filters.every(filter => filter(row)));
                        if (operation === 'insert') {
                            rows = payload.map(value => {
                                value = clone(value);
                                if (table === 'clients' && (value.new_client || value.client_id)) {
                                    let contact;
                                    if (value.new_client) {
                                        if (!value.new_client.name?.trim()) throw new Error('Enter the client name.');
                                        contact = { ...value.new_client, name: value.new_client.name.trim(), id: crypto.randomUUID() };
                                        db.client_contacts.push(contact);
                                    } else contact = db.client_contacts.find(item => item.id === value.client_id);
                                    if (!contact) throw new Error('Choose an existing client or create a new one.');
                                    value.client_id = contact.id; value.client_name = contact.name;
                                    delete value.new_client;
                                }
                                return { ...value, id: crypto.randomUUID(), created_at: new Date().toISOString(), ...(table === 'clients' ? { project_steps: clone(db.project_defaults[0].steps) } : {}) }; });
                            db[table].push(...rows);
                        }
                        if (single && rows.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'Data changed elsewhere. Reload and try again.' } };
                        if (operation === 'update') rows.forEach(row => Object.assign(row, clone(payload)));
                        if (operation === 'delete') db[table] = db[table].filter(row => !rows.includes(row));
                        if (operation !== 'select') write(db);
                        if (sort) rows.sort((a, b) => String(a[sort.field]).localeCompare(String(b[sort.field])) * (sort.ascending ? 1 : -1));
                        return { data: clone(single ? rows[0] : rows), error: null };
                    } catch (error) { return { data: null, error: { message: 'Local data could not be loaded or saved. Check browser storage availability. ' + error.message } }; }
                });
                return promise.then(resolve, reject);
            }
        };
        return query;
    }
    const sessionKey = 'pqd-crm-local-session';
    const admin = { id: 'local-admin', username: 'ADMIN', first_name: 'ADMIN', last_name: '', role: 'admin' };
    window.crmLocal = {
        async exportWorkspace() { return navigator.locks.request(key, () => clone(read())); },
        from,
        auth: {
            async getSession() {
                const signedIn = localStorage.getItem(sessionKey) === admin.id;
                return { data: { session: signedIn ? { user: clone(admin) } : null }, error: null };
            },
            async signInWithPassword({ email, password }) {
                try {
                    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password || ''));
                    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
                    if ((email || '').trim().toUpperCase() !== 'ADMIN' || hash !== '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5') {
                        return { data: { session: null }, error: { message: 'Incorrect username or password.' } };
                    }
                    await navigator.locks.request(key, () => {
                        const db = read();
                        if (!db.profiles.some(user => user.id === admin.id)) db.profiles.push(clone(admin));
                        write(db);
                    });
                    localStorage.setItem(sessionKey, admin.id);
                    return { data: { user: clone(admin), session: { user: clone(admin) } }, error: null };
                } catch (error) { return { data: { session: null }, error: { message: 'Unable to sign in locally. Check browser storage availability.' } }; }
            },
            async signOut() { localStorage.removeItem(sessionKey); return { error: null }; }
        },
        user() {
            const user = clone(localStorage.getItem(sessionKey) === admin.id ? (read().profiles.find(user => user.id === admin.id) || admin) : read().profiles[0]);
            user.profile = { ...user };
            user.getDisplayName = () => [user.first_name, user.last_name].filter(Boolean).join(' ');
            user.getAvatarUrl = () => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="#47bff0"/><text x="32" y="40" text-anchor="middle" font-size="24">L</text></svg>');
            return user;
        }
    };
    document.addEventListener('app:init', () => {
        const banner = document.createElement('p');
        banner.style.cssText = 'background:#eaf7fd;color:#24546a;padding:12px 20px;border-radius:12px;margin-bottom:20px;font-size:13px;line-height:1.5';
        banner.textContent = 'Local workspace · Saved in this browser on this device. No sign-in required. ';
        const link = document.createElement('a'); link.href = 'project-defaults.html'; link.textContent = 'Project Procedure';
        const clients = document.createElement('a'); clients.href = 'clients.html'; clients.textContent = 'Projects';
        banner.append(link, ' · ', clients);
        document.querySelector('main')?.prepend(banner);
    }, { once: true });
})();
