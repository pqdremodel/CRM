const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
class Element {
    constructor(tag = 'div') { this.style = {}; this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.disabled = false; this.hidden = false; this.value = ''; this.textContent = ''; this.classList = { add() {}, remove() {} }; }
    append(...items) { items.forEach(item => { item.parentNode = this; this.children.push(item); }); }
    insertBefore(item, before) { item.remove(); item.parentNode = this; this.children.splice(this.children.indexOf(before), 0, item); }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = null; }
    cloneNode() { const copy = new Element(this.tag); copy.className = this.className; return copy; }
    getBoundingClientRect() { return { top: 0, left: 0, width: 500, height: 80 }; }
    animate() {}
    replaceChildren(...items) { this.children = []; this.append(...items); }
    setAttribute() {}
    addEventListener(event, fn) { this.listeners[event] = fn; }
    querySelectorAll(selector) { const tags = selector.split(',').map(s => s.trim()); return this.children.flatMap(c => [...(tags.includes(c.tag) || tags.some(t => t.startsWith('.') && c.className?.split(' ').includes(t.slice(1))) ? [c] : []), ...c.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0]; }
    get lastElementChild() { return this.children.at(-1); }
    closest(selector) { return selector === '.' + this.className ? this : null; }
    setPointerCapture() {}
    focus() {}
    reportValidity() { return true; }
}
const seed = [{ id: 's1', title: 'Planning', tasks: [{ id: 't1', title: 'Confirm scope', description: 'Confirm the requested scope.', template: 'Hello [[FirstName]],\nPlease confirm.' }] }];
async function setup(file, { failure = false, conflict = false, projectSteps = seed, defaults = seed, projectId = null } = {}) {
    const elements = {}, calls = [];
    const el = id => elements[id] ||= new Element();
    let init;
    const events = {}; let hit = null;
    const document = { body: new Element(), getElementById: el, createElement: tag => new Element(tag), elementFromPoint: () => hit, addEventListener: (name, fn) => { events[name] = fn; if (name === 'app:init') init = fn; } };
    const form = el('workflow-form'); form.append(el('workflow-save'), el('workflow-add'), el('workflow-steps'));
    const client = { from(table) {
        const call = { table, filters: [] }; calls.push(call);
        const query = {
            select() { return query; }, update(value) { call.update = value; return query; },
            eq(...args) { call.filters.push(args); return query; }, is(...args) { call.filters.push(args); return query; },
            async single() {
                if (failure) return { error: { message: 'Offline' } };
                if (call.update && conflict) return { error: { code: 'PGRST116' } };
                return { data: table === 'project_defaults' ? { steps: structuredClone(defaults), revision: call.update?.revision || 1 } : { project_steps: structuredClone(call.update?.project_steps ?? projectSteps) } };
            }
        }; return query;
    } };
    const context = { document, supabaseClient: client, requireAuth: async () => ({ getDisplayName: () => 'Tester', getAvatarUrl: () => '' }),
        URLSearchParams, window: { location: { search: projectId ? '?project=' + projectId : '' }, addEventListener() {}, confirm: () => true, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, matchMedia: () => ({ matches: false }) }, crypto: require('node:crypto').webcrypto, console: { error() {} } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
    if (init) await init(); else context.window.loadProjectChecklist({ id: 'project1', project_steps: projectSteps });
    const click = async element => { await element.listeners.click({ preventDefault() {}, stopPropagation() {} }); await new Promise(resolve => setImmediate(resolve)); };
    const submit = async () => { await form.listeners.submit({ preventDefault() {} }); };
    return { el, calls, click, submit, events, body: document.body, hit: value => { hit = value; } };
}
test('template edits add, remove and save while keeping step order fixed', async () => {
    const { el, calls, click, submit } = await setup('project-defaults.js');
    await click(el('workflow-edit'));
    await click(el('workflow-add'));
    let input = el('workflow-steps').children[1].querySelector('input'); input.value = 'Closeout'; input.listeners.input();
    assert.equal(el('workflow-steps').children[1].children[0].querySelectorAll('button').length, 1);
    await submit();
    const saved = calls.at(-1);
    assert.equal(saved.update.steps[1].title, 'Closeout');
    assert.equal(saved.update.steps[0].tasks[0].title, 'Confirm scope');
    assert.equal(saved.update.steps[0].tasks[0].description, seed[0].tasks[0].description);
    assert.equal(saved.update.steps[0].tasks[0].template, seed[0].tasks[0].template);
    assert.equal(saved.update.revision, 2);
    assert.equal(saved.filters.find(([key]) => key === 'revision')[1], 1);
    await click(el('workflow-edit'));
    await click(el('workflow-steps').children[1].children[0].querySelectorAll('button')[0]);
    await submit();
    assert.equal(calls.at(-1).update.steps.length, 1);
});
test('template conflict preserves unsaved edits and reports error', async () => {
    const { el, submit, click } = await setup('project-defaults.js', { conflict: true });
    await click(el('workflow-edit'));
    const input = el('workflow-steps').querySelector('input'); input.value = 'My edit'; input.listeners.input();
    await submit();
    assert.match(el('workflow-message').textContent, /Another teammate/);
    assert.equal(el('workflow-dirty').textContent, 'Unsaved changes');
    assert.equal(el('workflow-save').disabled, false);
});
test('load failures never enable a blank template for saving', async () => {
    const { el, calls } = await setup('project-defaults.js', { failure: true });
    assert.match(el('workflow-message').textContent, /could not be loaded/);
    assert.equal(calls.some(call => call.update), false);
});
test('project completion writes an independent snapshot and guards stale data', async () => {
    const { el, calls } = await setup('project-checklist.js');
    const checkbox = el('project-task-list').querySelector('input'); checkbox.checked = true; checkbox.listeners.change();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls[0].update.project_steps[0].tasks[0].completed, true);
    assert.equal(seed[0].tasks[0].completed, undefined);
    assert.equal(calls[0].filters.find(([key]) => key === 'project_steps')[1], JSON.stringify(seed));
    assert.equal(el('project-task-count').textContent, '1/1 complete');
});
test('failed completion restores checkbox and shows retry guidance', async () => {
    const { el } = await setup('project-checklist.js', { failure: true });
    const checkbox = el('project-task-list').querySelector('input'); checkbox.checked = true; checkbox.listeners.change();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(el('project-task-list').querySelector('input').checked, false);
    assert.match(el('project-task-message').textContent, /Unable to save/);
});
test('older projects can explicitly adopt defaults; empty snapshots stay empty', async () => {
    const { el, click, calls } = await setup('project-checklist.js', { projectSteps: null });
    assert.equal(el('apply-project-defaults').hidden, false);
    await click(el('apply-project-defaults'));
    assert.equal(calls[1].filters.find(([key]) => key === 'project_steps')[1], null);
    assert.equal(el('apply-project-defaults').hidden, true);
    const empty = await setup('project-checklist.js', { projectSteps: [] });
    assert.equal(empty.el('apply-project-defaults').hidden, true);
    assert.equal(empty.calls.length, 0);
});

test('defaults are read-only until edit is selected and cancel discards adjustments', async () => {
    const { el, calls, click, submit } = await setup('project-defaults.js');
    assert.equal(el('workflow-steps').querySelectorAll('input').length, 0);
    assert.equal(el('workflow-steps').querySelectorAll('textarea').length, 0);
    assert.equal(el('workflow-save').hidden, true);
    await submit();
    assert.equal(calls.some(call => call.update), false);
    await click(el('workflow-edit'));
    const title = el('workflow-steps').querySelector('input');
    title.value = 'Unsaved rename'; title.listeners.input();
    await click(el('workflow-cancel'));
    assert.equal(el('workflow-steps').querySelectorAll('input').length, 0);
    await click(el('workflow-edit'));
    assert.equal(el('workflow-steps').querySelector('input').value, 'Planning');
    await submit();
    assert.equal(el('workflow-save').hidden, true);
    assert.equal(el('workflow-steps').querySelectorAll('input').length, 0);
});

test('dragging tasks supports same-step ordering, cross-step and empty-step moves without losing details', async () => {
    const defaults = [
        { id: 's1', title: 'First', tasks: [seed[0].tasks[0], { id: 't2', title: 'Second task' }, { id: 't3', title: 'Third task' }] },
        { id: 's2', title: 'Empty step', tasks: [] }
    ];
    const { el, click, calls, submit, events, hit, body } = await setup('project-defaults.js', { defaults });
    await click(el('workflow-edit'));
    const move = (stepIndex, taskIndex, targetStep, beforeTask) => {
        hit(null);
        const handles = el('workflow-steps').children[stepIndex].querySelectorAll('button').filter(b => b.className === 'workflow-drag-handle');
        handles[taskIndex].listeners.pointerdown({ button: 0, pointerId: 1, clientX: 100, clientY: 200 });
        events.pointermove({ pointerId: 1, clientX: 120, clientY: 200, preventDefault() {} });
        assert.equal(el('workflow-steps').dataset.dragging, 'true');
        assert.equal(body.children.length, 1);
        assert.equal(el('workflow-steps').querySelectorAll('.workflow-drag-placeholder').length, 1);
        const zone = el('workflow-steps').querySelectorAll('div').find(b => b.dataset.stepId === targetStep && b.dataset.beforeTaskId === beforeTask);
        hit(zone);
        events.pointermove({ pointerId: 1, clientX: 130, clientY: 220, preventDefault() {} });
        assert.equal(zone.parentNode.children[zone.parentNode.children.indexOf(zone) - 1].className, 'workflow-drag-placeholder');
        events.pointerup({ pointerId: 1, clientX: 120, clientY: 200 });
        assert.equal(el('workflow-steps').dataset.dragging, 'false');
    };
    move(0, 0, 's1', ''); // Move first task to end.
    move(0, 2, 's1', 't2'); // Move it back before the first task.
    move(0, 1, 's1', 't2'); // Self-drop is a no-op.
    move(0, 0, 's2', ''); // Move full task into an empty step.
    await submit();
    const saved = calls.at(-1).update.steps;
    assert.equal(saved[0].tasks.map(t => t.id).join(','), 't2,t3');
    assert.equal(saved[1].tasks[0].id, 't1');
    assert.equal(saved[1].tasks[0].description, seed[0].tasks[0].description);
    assert.equal(saved[1].tasks[0].template, seed[0].tasks[0].template);
    assert.equal(saved.map(s => s.id).join(','), 's1,s2');
});

test('procedure shows one step and requires explicit advancement after completing all tasks', async () => {
    const projectSteps = [
        { id: 's1', title: 'First', tasks: [{ id: 'a', title: 'One' }, { id: 'b', title: 'Two' }] },
        { id: 's2', title: 'Second', tasks: [{ id: 'c', title: 'Three' }] }
    ];
    const { el, click, calls } = await setup('project-checklist.js', { projectSteps });
    const list = el('project-task-list');
    const next = () => list.querySelectorAll('button').find(b => b.textContent === 'Next step →');
    assert.equal(list.querySelectorAll('h4').length, 1);
    assert.equal(list.querySelectorAll('input').length, 2);
    assert.equal(next(), undefined);
    for (let index = 0; index < 2; index++) {
        const checkbox = list.querySelectorAll('input')[index];
        checkbox.checked = true; checkbox.listeners.change();
        await new Promise(resolve => setImmediate(resolve));
        if (index === 0) assert.equal(next(), undefined);
    }
    assert.equal(list.querySelector('h4').textContent, '1. First');
    assert.ok(next());
    await click(next());
    assert.equal(list.querySelector('h4').textContent, '2. Second');
    assert.equal(list.querySelectorAll('input').length, 1);
    assert.equal(calls.at(-1).update.project_steps[0].advanced, true);
    const reload = await setup('project-checklist.js', { projectSteps: calls.at(-1).update.project_steps });
    assert.equal(reload.el('project-task-list').querySelector('h4').textContent, '2. Second');
    const last = list.querySelector('input'); last.checked = true; last.listeners.change();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(next(), undefined);
    assert.ok(list.querySelectorAll('p').some(p => p.textContent.includes('Project procedure complete')));
});
test('empty steps can advance and failed advancement keeps the current step', async () => {
    const projectSteps = [{ id: 's1', title: 'Empty', tasks: [] }, { id: 's2', title: 'Next', tasks: [] }];
    const { el, click } = await setup('project-checklist.js', { projectSteps, failure: true });
    await click(el('project-task-list').querySelector('button'));
    assert.equal(el('project-task-list').querySelector('h4').textContent, '1. Empty');
    assert.match(el('project-task-message').textContent, /Unable to save/);
});

test('job procedure editor saves only its project and preserves completion and advancement', async () => {
    const projectSteps = [{ id: 's1', title: 'Job plan', advanced: true, tasks: [{ id: 't1', title: 'Measured', completed: true, description: 'Job notes', template: 'Job email' }] }];
    const { el, calls, submit } = await setup('project-defaults.js', { projectId: 'job-123', projectSteps });
    assert.equal(el('workflow-save').hidden, false);
    assert.equal(el('procedure-back').href, 'project.html?id=job-123');
    const title = el('workflow-steps').querySelector('input'); title.value = 'Custom job plan'; title.listeners.input();
    await submit();
    const saved = calls.at(-1);
    assert.equal(saved.table, 'clients');
    assert.deepEqual(saved.filters.find(([key]) => key === 'id'), ['id', 'job-123']);
    assert.equal(saved.filters.find(([key]) => key === 'project_steps')[1], JSON.stringify(projectSteps));
    assert.equal(saved.update.project_steps[0].title, 'Custom job plan');
    assert.equal(saved.update.project_steps[0].advanced, true);
    assert.equal(saved.update.project_steps[0].tasks[0].completed, true);
    assert.equal(saved.update.project_steps[0].tasks[0].template, 'Job email');
    assert.equal(calls.some(call => call.table === 'project_defaults'), false);
});
test('job procedure cancellation and stale saves never overwrite stored progress', async () => {
    const { el, click, calls, submit } = await setup('project-defaults.js', { projectId: 'job-123', conflict: true });
    const title = el('workflow-steps').querySelector('input'); title.value = 'My edit'; title.listeners.input();
    await submit();
    assert.match(el('workflow-message').textContent, /changed the procedure/);
    assert.equal(el('workflow-steps').querySelector('input').value, 'My edit');
    await click(el('workflow-cancel'));
    await click(el('workflow-edit'));
    assert.equal(el('workflow-steps').querySelector('input').value, 'Planning');
    assert.equal(calls.filter(call => call.update).length, 1);
    assert.equal(calls.some(call => call.table === 'project_defaults'), false);
});

test('return to previous step saves position, preserves completion, and allows forward navigation again', async () => {
    const projectSteps = [
        { id: 's1', title: 'First', advanced: true, tasks: [{ id: 'a', title: 'Done', completed: true }] },
        { id: 's2', title: 'Second', tasks: [{ id: 'b', title: 'Pending' }] }
    ];
    const { el, click, calls } = await setup('project-checklist.js', { projectSteps });
    const list = el('project-task-list');
    await click(list.querySelectorAll('button').find(b => b.textContent === '← Return to previous step'));
    assert.equal(list.querySelector('h4').textContent, '1. First');
    assert.equal(list.querySelector('input').checked, true);
    assert.equal(list.querySelectorAll('button').some(b => b.textContent === '← Return to previous step'), false);
    const saved = calls.at(-1).update.project_steps;
    assert.equal(saved[0].tasks[0].completed, true);
    assert.equal(saved[1].tasks[0].completed, undefined);
    const reload = await setup('project-checklist.js', { projectSteps: saved });
    assert.equal(reload.el('project-task-list').querySelector('h4').textContent, '1. First');
    await click(list.querySelectorAll('button').find(b => b.textContent === 'Next step →'));
    assert.equal(list.querySelector('h4').textContent, '2. Second');
});
