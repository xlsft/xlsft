export const ASSISTANT_TOOLS = ['show_experience', 'show_projects', 'show_project', 'show_repos', 'show_skills', 'show_contacts', 'show_downloads', 'match_vacancy', 'web_search', 'submit_request', 'update_request'] as const
export const ASSISTANT_SEND_WINDOW = 12
export const ASSISTANT_STORE_LIMIT = 60
export const ASSISTANT_FORMATS = [
    { format: 'pdf', label: 'PDF', icon: 'mingcute:pdf-line' },
    { format: 'docx', label: 'DOCX', icon: 'mingcute:doc-line' },
    { format: 'md', label: 'MD', icon: 'mingcute:markdown-line' },
] as const
