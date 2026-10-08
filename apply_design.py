with open('/Users/officeassistant/CRM/style.css', 'r') as f:
    css = f.read()

# Make sure tables don't go offscreen by making table-container horizontal scrollable on mobile
# I will append overrides to the end of the file.

overrides = """
/* MENGOBROL GLOBAL REDESIGN */

/* Buttons */
.btn {
    border-radius: 30px !important;
    padding: 10px 24px !important;
    font-weight: 600 !important;
    font-size: 13px !important;
    letter-spacing: -0.2px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
}

.btn-primary {
    background-color: #000 !important;
    color: #fff !important;
    border: none !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}

.btn-outline {
    background-color: #fff !important;
    color: #000 !important;
    border: 1px solid #e0e0e0 !important;
}

/* Inputs & Search Bars */
.search-bar, .form-group input, .form-group select {
    border-radius: 30px !important;
    background-color: #f5f5f5 !important;
    border: 1px solid transparent !important;
    padding: 12px 20px !important;
    font-size: 14px !important;
    color: #000 !important;
}

.search-bar input {
    background-color: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
}

.form-group input:focus, .form-group select:focus {
    border: 1px solid #000 !important;
    background-color: #fff !important;
}

/* Cards & Modals */
.user-profile, .main-content, .modal-content, .bottom-sheet-content {
    border-radius: 24px !important;
    border: none !important;
}

.modal-content {
    box-shadow: 0 10px 40px rgba(0,0,0,0.1) !important;
    padding: 32px !important;
}

/* Tables and Mobile Responsiveness */
.table-container {
    width: 100%;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 8px;
}

table {
    min-width: 800px; /* Ensure table doesn't squish too much and instead scrolls */
}

/* Fix mobile top-bar */
@media (max-width: 768px) {
    .top-bar {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start !important;
    }
    .search-bar {
        width: 100% !important;
    }
    .actions {
        width: 100%;
        display: flex;
        overflow-x: auto;
        padding-bottom: 8px;
        -webkit-overflow-scrolling: touch;
    }
    .actions::-webkit-scrollbar {
        display: none;
    }
    .actions .btn {
        flex-shrink: 0;
    }
}
"""

if "MENGOBROL GLOBAL REDESIGN" not in css:
    with open('/Users/officeassistant/CRM/style.css', 'w') as f:
        f.write(css + "\n" + overrides)
    print("Design Overrides Applied!")
else:
    print("Overrides already present")
