with open('/Users/officeassistant/CRM/style.css', 'r') as f:
    css = f.read()

fix_css = """
/* Project Layout Mobile Overrides */
@media (max-width: 768px) {
    .grid-layout {
        grid-template-columns: 1fr !important;
        padding: 0 16px 16px 16px !important;
    }
    .project-header {
        flex-direction: column;
        padding: 24px 16px 0 16px !important;
        gap: 16px;
    }
    .project-actions {
        width: 100%;
        overflow-x: auto;
        padding-bottom: 8px;
        -webkit-overflow-scrolling: touch;
    }
    .project-actions::-webkit-scrollbar {
        display: none;
    }
    .pipeline {
        margin: 16px !important;
        flex-direction: column;
        align-items: flex-start !important;
        gap: 12px !important;
    }
    .pipeline-step::after {
        display: none;
    }
    .card-body .task-actions {
        flex-direction: column;
    }
}
"""

if "Project Layout Mobile Overrides" not in css:
    with open('/Users/officeassistant/CRM/style.css', 'w') as f:
        f.write(css + "\n" + fix_css)
    print("Project overrides applied.")
else:
    print("Project overrides already present.")
