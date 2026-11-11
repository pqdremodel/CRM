window.loadProjectChecklist = function(client) {
    const list = document.getElementById('project-task-list');
    const message = document.getElementById('project-task-message');
    const count = document.getElementById('project-task-count');
    const apply = document.getElementById('apply-project-defaults');
    const edit = document.getElementById('edit-project-procedure');
    edit.href = `project-defaults.html?project=${encodeURIComponent(client.id)}`;
    let steps = client.project_steps;
    let busy = false;
    const openTasks = new Set();
    function render() {
        list.replaceChildren();
        apply.hidden = steps !== null;
        edit.hidden = !Array.isArray(steps);
        if (steps === undefined) {
            message.textContent = 'Project checklists are not available yet. Ask your administrator to finish setup.';
            return;
        }
        if (steps === null) {
            message.textContent = 'This project predates default checklists. Apply the current defaults to start a checklist.';
            return;
        }
        const tasks = steps.flatMap(step => step.tasks);
        count.textContent = `${tasks.filter(task => task.completed).length}/${tasks.length} complete`;
        message.textContent = steps.length ? '' : 'This project has an empty checklist.';
        // Advancement is explicit and saved with this project's checklist snapshot.
        const firstPending = steps.findIndex(step => !step.advanced || step.tasks.some(task => !task.completed));
        const activeIndex = firstPending < 0 ? steps.length - 1 : firstPending;
        steps.forEach((step, i) => {
            if (i !== activeIndex) return;
            const progress = document.createElement('p'); progress.className = 'project-step-progress';
            progress.textContent = `Step ${i + 1} of ${steps.length} · ${step.tasks.filter(task => task.completed).length}/${step.tasks.length} tasks complete`;
            const section = document.createElement('section'); section.className = 'project-procedure-step';
            const header = document.createElement('header'); header.className = 'project-procedure-header';
            header.append(progress);
            section.append(header); list.append(section);
            const heading = document.createElement('h4'); heading.textContent = `${i + 1}. ${step.title}`;
            header.append(heading);
            step.tasks.forEach((task, j) => {
                const card = document.createElement('details'); card.className = 'workflow-task-block project-procedure-task';
                card.open = openTasks.has(task.id);
                card.dataset.completed = String(!!task.completed);
                card.addEventListener('toggle', () => { if (card.open) openTasks.add(task.id); else openTasks.delete(task.id); });
                const summary = document.createElement('summary'); summary.className = 'workflow-task-summary';
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = !!task.completed;
                checkbox.setAttribute('aria-label', `Mark ${task.title} complete`);
                checkbox.addEventListener('click', event => event.stopPropagation());
                const title = document.createElement('span'); title.className = 'workflow-task-title'; title.textContent = task.title;
                const arrow = document.createElement('span'); arrow.className = 'workflow-task-arrow'; arrow.textContent = '+'; arrow.setAttribute('aria-hidden', 'true');
                summary.append(checkbox, title, arrow); card.append(summary); section.append(card);
                checkbox.addEventListener('change', () => {
                    const next = JSON.parse(JSON.stringify(steps));
                    next[i].tasks[j].completed = checkbox.checked;
                    persist(next);
                });
                if (task.description || task.template) {
                    const details = document.createElement('div'); details.className = 'project-procedure-task-body';
                    if (task.description) { const description = document.createElement('p'); description.textContent = task.description; details.append(description); }
                    if (task.template) {
                        const template = document.createElement('pre'); template.textContent = task.template;
                        const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'btn btn-outline'; copy.textContent = 'Copy email template';
                        copy.addEventListener('click', async () => {
                            try { await navigator.clipboard.writeText(task.template); message.textContent = 'Template copied. Replace placeholders before using it.'; }
                            catch (error) { message.textContent = 'Could not copy. Select and copy the template text manually.'; }
                        });
                        const email = document.createElement('details'); email.className = 'project-task-details';
                        const emailHeading = document.createElement('summary'); emailHeading.textContent = 'Email template';
                        email.append(emailHeading, template, copy); details.append(email);
                    }
                    card.append(details);
                } else {
                    const empty = document.createElement('p'); empty.className = 'project-procedure-task-body'; empty.textContent = 'No additional details.'; card.append(empty);
                }
            });
            const navigation = document.createElement('div'); navigation.className = 'project-step-navigation';
            list.append(navigation);
            if (i > 0) {
                const previous = document.createElement('button');
                previous.type = 'button'; previous.className = 'btn btn-outline';
                previous.textContent = '← Return to previous step';
                previous.addEventListener('click', () => {
                    if (busy) return;
                    const next = JSON.parse(JSON.stringify(steps));
                    // Move the saved position back without changing task completion.
                    next.slice(i - 1).forEach(item => item.advanced = false);
                    persist(next);
                });
                navigation.append(previous);
            }
            if (step.tasks.every(task => task.completed)) {
                if (i < steps.length - 1) {
                    const nextButton = document.createElement('button');
                    nextButton.type = 'button'; nextButton.className = 'btn btn-primary project-next-step';
                    nextButton.textContent = 'Next step →';
                    nextButton.addEventListener('click', () => {
                        if (busy) return;
                        const next = JSON.parse(JSON.stringify(steps));
                        next[i].advanced = true;
                        persist(next);
                    });
                    navigation.append(nextButton);
                } else {
                    const complete = document.createElement('p'); complete.className = 'project-procedure-complete';
                    complete.textContent = 'Project procedure complete. All tasks are finished.';
                    list.append(complete);
                }
            }
        });
    }
    async function persist(next) {
        if (busy) return;
        busy = true; apply.disabled = true;
        list.querySelectorAll('input, button').forEach(input => input.disabled = true);
        message.textContent = 'Saving checklist…';
        try {
            let query = supabaseClient.from('clients').update({ project_steps: next }).eq('id', client.id);
            // Refuse to overwrite progress changed by another teammate.
            query = steps === null ? query.is('project_steps', null) : query.eq('project_steps', JSON.stringify(steps));
            const { data, error } = await query.select('project_steps').single();
            if (error || !data) throw new Error(error?.code === 'PGRST116'
                ? 'This checklist changed elsewhere. Reload the page before trying again.'
                : 'Unable to save. Check your connection and try again.');
            steps = data.project_steps; render(); message.textContent = 'Checklist saved.';
        } catch (error) { render(); message.textContent = error.message; }
        finally { busy = false; apply.disabled = false; list.querySelectorAll('input, button').forEach(input => input.disabled = false); }
    }
    apply.addEventListener('click', async () => {
        if (busy || steps !== null) return;
        apply.disabled = true;
        try {
            const { data, error } = await supabaseClient.from('project_defaults').select('steps').eq('id', true).single();
            if (error) throw error;
            await persist(data.steps);
        } catch (error) { message.textContent = 'Unable to load defaults. Please try again.'; }
        finally { apply.disabled = false; }
    });
    render();
};
