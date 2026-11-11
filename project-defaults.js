document.addEventListener('app:init', async () => {
    const projectId = window.location?.search ? new URLSearchParams(window.location.search).get('project') : null;
    const projectMode = projectId !== null;
    const message = document.getElementById('workflow-message');
    const form = document.getElementById('workflow-form');
    const container = document.getElementById('workflow-steps');
    const save = document.getElementById('workflow-save');
    let steps = [], revision = 0, dirty = false, editing = false, savedSteps = [];
    const openTasks = new Set();
    let draggedTaskId = null;
    let pointerMove = null;
    let dragVisual = null, scrollFrame = null;
    function clearDrag() {
        if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
        scrollFrame = null;
        if (dragVisual) {
            dragVisual.source.classList.remove('is-drag-source');
            dragVisual.source.style.width = '';
            dragVisual.ghost.remove(); dragVisual.placeholder.remove();
            dragVisual = null;
        }
        draggedTaskId = null;
        container.dataset.dragging = 'false';
        container.querySelectorAll('.workflow-drop-zone').forEach(zone => zone.classList.remove('is-over'));
    }
    function startDragVisual() {
        const source = pointerMove.block;
        const rect = source.getBoundingClientRect();
        const ghost = source.cloneNode(true);
        ghost.classList.add('workflow-drag-ghost');
        ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
        ghost.style.width = `${rect.width}px`;
        ghost.style.left = `${rect.left}px`; ghost.style.top = `${rect.top}px`;
        const placeholder = document.createElement('div'); placeholder.className = 'workflow-drag-placeholder';
        placeholder.style.height = `${rect.height}px`;
        placeholder.setAttribute('aria-hidden', 'true');
        source.parentNode.insertBefore(placeholder, source);
        source.style.width = `${rect.width}px`; source.classList.add('is-drag-source');
        document.body.append(ghost);
        dragVisual = { source, ghost, placeholder, offsetX: pointerMove.x - rect.left, offsetY: pointerMove.y - rect.top, target: null };
    }
    function positionDrag(x, y) {
        if (!dragVisual) return;
        dragVisual.ghost.style.left = `${x - dragVisual.offsetX}px`;
        dragVisual.ghost.style.top = `${y - dragVisual.offsetY}px`;
        const zone = dropTarget(x, y);
        if (!zone || zone === dragVisual.target) return;
        dragVisual.target = zone;
        const cards = [...container.querySelectorAll('.workflow-task-block')].filter(card => card !== dragVisual.source);
        const before = cards.map(card => card.getBoundingClientRect());
        zone.parentNode.insertBefore(dragVisual.placeholder, zone);
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            cards.forEach((card, i) => {
                const after = card.getBoundingClientRect();
                const dy = before[i].top - after.top;
                if (dy) card.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
            });
        }
    }
    function autoScroll() {
        if (!pointerMove?.moving || !dragVisual) return;
        const y = pointerMove.lastY;
        const delta = y < 80 ? -12 : y > window.innerHeight - 80 ? 12 : 0;
        if (delta) { window.scrollBy(0, delta); positionDrag(pointerMove.lastX, y); }
        scrollFrame = window.requestAnimationFrame(autoScroll);
    }
    function beginMove(task) {
        if (!editing || save.disabled) return false;
        draggedTaskId = task.id;
        container.dataset.dragging = 'true';

        return true;
    }
    function moveTask(targetStepId, beforeTaskId) {
        if (!editing || save.disabled || !draggedTaskId) return;
        const source = steps.find(step => step.tasks.some(task => task.id === draggedTaskId));
        const target = steps.find(step => step.id === targetStepId);
        if (!source || !target || beforeTaskId === draggedTaskId) { clearDrag(); return; }
        const sourceIndex = source.tasks.findIndex(task => task.id === draggedTaskId);
        if (source === target && (target.tasks[sourceIndex + 1]?.id || null) === beforeTaskId) { clearDrag(); return; }
        const [task] = source.tasks.splice(sourceIndex, 1);
        const index = beforeTaskId === null ? target.tasks.length : target.tasks.findIndex(task => task.id === beforeTaskId);
        target.tasks.splice(index < 0 ? target.tasks.length : index, 0, task);
        clearDrag(); changed(); render();
        status(`Moved “${task.title || 'New task'}” to ${target.title || 'the selected step'}. Save changes to keep this order.`);
    }
    function dropZone(step, beforeTask = null) {
        const zone = document.createElement('div');
        zone.className = 'workflow-drop-zone';
        zone.setAttribute('aria-hidden', 'true');
        zone.dataset.stepId = step.id;
        zone.dataset.beforeTaskId = beforeTask?.id || '';
        return zone;
    }
    function dropTarget(x, y) {
        const hit = document.elementFromPoint(x, y);
        const direct = hit?.closest('.workflow-drop-zone');
        if (direct) return direct;
        if (hit?.closest('.workflow-drag-placeholder')) return dragVisual?.target || null;
        const section = hit?.closest('.workflow-step');
        if (!section) return null;
        const zones = [...section.querySelectorAll('.workflow-drop-zone')];
        const cards = [...section.querySelectorAll('.workflow-task-block')].filter(card => card !== dragVisual?.source);
        const next = cards.find(card => {
            const rect = card.getBoundingClientRect();
            return y < rect.top + rect.height / 2;
        });
        return next ? zones.find(zone => zone.dataset.beforeTaskId === next.dataset.taskId) : zones[zones.length - 1];
    }
    document.addEventListener('pointermove', event => {
        if (!pointerMove || pointerMove.id !== event.pointerId) return;
        if (!pointerMove.moving && Math.hypot(event.clientX - pointerMove.x, event.clientY - pointerMove.y) < 6) return;
        if (!pointerMove.moving) {
            pointerMove.moving = beginMove(pointerMove.task);
            if (pointerMove.moving) { startDragVisual(); scrollFrame = window.requestAnimationFrame(autoScroll); }
        }
        if (!pointerMove.moving) return;
        event.preventDefault();
        pointerMove.lastX = event.clientX; pointerMove.lastY = event.clientY;
        positionDrag(event.clientX, event.clientY);
    });
    document.addEventListener('pointerup', event => {
        if (!pointerMove || pointerMove.id !== event.pointerId) return;
        if (pointerMove.moving) {
            const zone = dropTarget(event.clientX, event.clientY) || dragVisual?.target;
            if (zone) moveTask(zone.dataset.stepId, zone.dataset.beforeTaskId || null);
            else { pointerMove = null; clearDrag(); status('Task move canceled.'); }
        }
        pointerMove = null;
    });
    document.addEventListener('pointercancel', () => { pointerMove = null; clearDrag(); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && draggedTaskId) { pointerMove = null; clearDrag(); status('Task move canceled.'); }
    });
    function status(text, error = false) {
        message.textContent = text;
        message.dataset.error = String(error);
    }
    function changed() {
        dirty = true;
        document.getElementById('workflow-dirty').textContent = 'Unsaved changes';
        count();
    }
    function count() {
        document.getElementById('workflow-count').textContent = `${steps.length} steps · ${steps.reduce((sum, step) => sum + step.tasks.length, 0)} tasks`;
    }
    function button(text, label, action, disabled = false) {
        const el = document.createElement('button');
        el.type = 'button'; el.textContent = text;
        el.setAttribute('aria-label', label); el.title = label; el.disabled = disabled;
        el.addEventListener('click', action);
        return el;
    }
    function tools(items, index, label, reorder = true) {
        const group = document.createElement('div'); group.className = 'workflow-tools'; group.hidden = !editing;
        const move = offset => {
            if (!editing || save.disabled) return;
            [items[index], items[index + offset]] = [items[index + offset], items[index]];
            changed(); render();
        };
        if (reorder) group.append(button('↑', `Move ${label} up`, () => move(-1), index === 0));
        if (reorder) group.append(button('↓', `Move ${label} down`, () => move(1), index === items.length - 1));
        group.append(button('Remove', `Remove ${label}`, () => {
            if (!editing || save.disabled) return;
            if (!window.confirm(projectMode ? `Remove ${label} from this project's procedure?` : `Remove ${label} from the defaults? This will not change existing projects.`)) return;
            items.splice(index, 1); changed(); render();
        }));
        return group;
    }
    function input(value, label, change) {
        if (!editing) {
            const text = document.createElement('p'); text.textContent = value; return text;
        }
        const el = document.createElement('input');
        el.type = 'text'; el.value = value; el.required = true; el.maxLength = 200;
        el.setAttribute('aria-label', label); el.placeholder = label;
        el.addEventListener('input', () => { change(el.value); changed(); });
        return el;
    }
    function textArea(value, caption, accessibleName, onChange) {
        const label = document.createElement('label'); label.className = 'workflow-text-field';
        const title = document.createElement('span'); title.textContent = caption;
        if (!editing) {
            const text = document.createElement('p'); text.className = 'workflow-read-text'; text.textContent = value || 'No description provided.';
            label.append(title, text); return label;
        }
        const field = document.createElement('textarea'); field.value = value || ''; field.rows = caption === 'Description' ? 4 : 12;
        field.setAttribute('aria-label', accessibleName);
        field.addEventListener('input', () => { onChange(field.value); changed(); });
        label.append(title, field); return label;
    }
    function render() {
        pointerMove = null; clearDrag();
        container.replaceChildren(); count();
        save.hidden = !editing;
        document.getElementById('workflow-cancel').hidden = !editing;
        document.getElementById('workflow-add').hidden = !editing;
        document.getElementById('workflow-edit').hidden = editing;
        if (!steps.length) {
            const empty = document.createElement('p'); empty.className = 'workflow-empty';
            empty.textContent = 'No default steps yet. Add a step to begin. Saving an empty list gives new projects an empty checklist.';
            container.append(empty);
        }
        steps.forEach((step, i) => {
            const section = document.createElement('section'); section.className = 'workflow-step';
            const header = document.createElement('header');
            const number = document.createElement('h3'); number.className = 'workflow-number'; number.textContent = `${i + 1}.`;
            header.append(number, tools(steps, i, `step ${i + 1}`, false));
            const name = input(step.title, `Step ${i + 1} name`, value => step.title = value);
            name.className = 'workflow-step-name';
            header.append(name);
            section.append(header);
            step.tasks.forEach((task, j) => {
                if (editing) section.append(dropZone(step, task));
                const block = document.createElement('details'); block.className = 'workflow-task-block'; block.dataset.taskId = task.id;
                block.open = openTasks.has(task.id) || !task.title;
                block.addEventListener('toggle', () => {
                    if (block.open) openTasks.add(task.id); else openTasks.delete(task.id);
                });
                const taskSummary = document.createElement('summary'); taskSummary.className = 'workflow-task-summary';
                const titlePreview = document.createElement('span');
                titlePreview.className = 'workflow-task-title workflow-task-title-preview';
                titlePreview.textContent = task.title || 'New task';
                const taskTitle = editing
                    ? input(task.title, `Step ${i + 1}, task ${j + 1}`, value => { task.title = value; titlePreview.textContent = value || 'New task'; })
                    : document.createElement('span');
                taskTitle.className = 'workflow-task-title';
                if (!editing) taskTitle.textContent = task.title || 'New task';
                else {
                    taskTitle.addEventListener('invalid', () => { block.open = true; });
                    taskTitle.addEventListener('click', event => event.stopPropagation());
                    taskTitle.addEventListener('keydown', event => {
                        event.stopPropagation();
                        if (event.key === 'Enter') { event.preventDefault(); taskTitle.blur(); }
                    });
                }
                const arrow = document.createElement('span'); arrow.className = 'workflow-task-arrow'; arrow.textContent = '+'; arrow.setAttribute('aria-hidden', 'true');
                if (editing) {
                    const handle = button('⠿', `Move ${task.title || 'new task'}`, event => {
                        event.preventDefault(); event.stopPropagation();
                    });
                    handle.className = 'workflow-drag-handle';
                    handle.title = '';
                    handle.addEventListener('pointerdown', event => {
                        if (event.button !== 0 || !editing || save.disabled) return;
                        pointerMove = { task, block, id: event.pointerId, x: event.clientX, y: event.clientY, moving: false };
                        handle.setPointerCapture(event.pointerId);
                    });
                    taskSummary.append(handle);
                }
                if (editing) taskSummary.append(titlePreview);
                taskSummary.append(taskTitle, arrow);
                const body = document.createElement('div'); body.className = 'workflow-task-body';
                const row = document.createElement('div'); row.className = 'workflow-task';
                row.hidden = !editing;
                row.append(tools(step.tasks, j, `task ${j + 1} in step ${i + 1}`));
                body.append(row, textArea(task.description, 'Description', `Step ${i + 1}, task ${j + 1} description`, value => task.description = value));
                const details = document.createElement('details'); details.className = 'workflow-template';
                const summary = document.createElement('summary'); summary.textContent = task.template ? 'Email template' : 'Add email template';
                const field = textArea(task.template, 'Email template (including subject, if provided)', `Step ${i + 1}, task ${j + 1} email template`, value => task.template = value);
                const copy = button('Copy template', `Copy template for task ${j + 1} in step ${i + 1}`, async () => {
                    try { await navigator.clipboard.writeText(task.template || ''); status('Template copied. Replace placeholders before using it.'); }
                    catch (error) { status('Could not copy. Select and copy the template text manually.', true); }
                });
                copy.className = 'btn btn-outline'; details.append(summary, field, copy);
                details.hidden = !editing && !task.template;
                body.append(details); block.append(taskSummary, body); section.append(block);
            });
            if (editing) section.append(dropZone(step));
            const add = button('+ Add task', `Add task to step ${i + 1}`, () => {
                if (!editing || save.disabled) return;
                step.tasks.push({ id: crypto.randomUUID(), title: '' }); changed(); render();
                container.children[i].querySelectorAll('input')[step.tasks.length].focus();
            });
            add.className = 'btn btn-outline'; add.hidden = !editing; section.append(add); container.append(section);
        });
    }
    window.addEventListener('beforeunload', event => {
        if (dirty) { event.preventDefault(); event.returnValue = ''; }
    });
    document.getElementById('workflow-edit').addEventListener('click', () => {
        if (editing || save.disabled) return;
        editing = true;
        render(); status('Drag a task by its handle to reorder it or move it to another step. Save changes to apply, or cancel to discard.');
    });
    document.getElementById('workflow-cancel').addEventListener('click', () => {
        if (save.disabled) return;
        steps = JSON.parse(JSON.stringify(savedSteps)); editing = false; dirty = false;
        document.getElementById('workflow-dirty').textContent = '';
        render(); status(projectMode ? 'Changes canceled. This project’s saved procedure is unchanged.' : 'Changes canceled. Saved defaults are unchanged.');
    });
    document.getElementById('workflow-add').addEventListener('click', () => {
        if (!editing || save.disabled) return;
        steps.push({ id: crypto.randomUUID(), title: '', tasks: [] }); changed(); render();
        container.lastElementChild.querySelector('input').focus();
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!editing || save.disabled || !form.reportValidity()) return;
        const snapshot = steps.map(step => ({ ...(projectMode ? step : {}), id: step.id, title: step.title.trim(), tasks: step.tasks.map(task => ({ ...(projectMode ? task : {}), id: task.id, title: task.title.trim(), description: task.description || '', template: task.template || '' })) }));
        if (snapshot.some(step => !step.title || step.tasks.some(task => !task.title))) {
            status('Give every step and task a name before saving.', true); return;
        }
        // Freeze editing until this exact snapshot has been acknowledged.
        const controls = [...form.querySelectorAll('button, input, textarea')];
        const disabled = controls.map(control => control.disabled);
        controls.forEach(control => control.disabled = true);
        status(projectMode ? 'Saving project procedure…' : 'Saving defaults…');
        try {
            const query = projectMode
                ? supabaseClient.from('clients').update({ project_steps: snapshot }).eq('id', projectId).eq('project_steps', JSON.stringify(savedSteps)).select('project_steps')
                : supabaseClient.from('project_defaults').update({ steps: snapshot, revision: revision + 1 }).eq('id', true).eq('revision', revision).select('revision');
            const { data, error } = await query.single();
            if (error || !data) throw new Error(error?.code === 'PGRST116'
                ? 'Another teammate changed the procedure. Reload this page before editing again; your changes have not been saved.'
                : error?.message || 'The procedure was not saved. Please try again.');
            revision = data.revision; steps = snapshot; dirty = false; editing = false;
            savedSteps = JSON.parse(JSON.stringify(steps));
            render();
            document.getElementById('workflow-dirty').textContent = 'All changes saved';
            status(projectMode ? 'Project procedure saved. The default procedure and other projects are unchanged.' : 'Defaults saved. New projects will receive this checklist.');
        } catch (error) { status(`Could not save ${projectMode ? "project procedure" : "defaults"}. ${error.message}`, true); }
        finally { controls.forEach((control, i) => control.disabled = disabled[i]); }
    });
    try {
        const user = await requireAuth();
        if (!user) return;
        document.getElementById('profile-email').textContent = user.getDisplayName();
        document.getElementById('profile-avatar').src = user.getAvatarUrl();
        const { data, error } = await (projectMode
            ? supabaseClient.from('clients').select('*').eq('id', projectId).single()
            : supabaseClient.from('project_defaults').select('steps, revision').eq('id', true).single());
        if (error || !data) throw error || new Error('Procedure not found.');
        if (projectMode) {
            if (!Array.isArray(data.project_steps)) throw new Error('This project has no procedure yet. Apply a procedure from its project page first.');
            steps = data.project_steps; editing = true;
            document.title = 'Edit project procedure - PQD Remodels';
            document.getElementById('procedure-page-title').textContent = 'Edit project procedure';
            document.getElementById('procedure-heading').textContent = data.project_name || data.name || 'Project procedure';
            document.getElementById('procedure-description').textContent = 'Adjust the steps and tasks for this job only. The default procedure and other projects stay unchanged.';
            const back = document.getElementById('procedure-back');
            back.href = `project.html?id=${encodeURIComponent(projectId)}`; back.hidden = false;
        } else { steps = data.steps; revision = data.revision; }
        savedSteps = JSON.parse(JSON.stringify(steps));
        render(); form.hidden = false;
        status(projectMode ? 'Edit this job’s steps and tasks, then save your changes.' : 'Open a task to view its details. Select Edit steps & tasks to make changes.');
    } catch (error) {
        status(projectMode ? 'This project’s procedure could not be loaded. ' + error.message : 'Project defaults could not be loaded. Check your connection or ask your administrator to finish setting up project defaults.', true);
        console.error('Loading project defaults:', error);
    }
}, { once: true });
