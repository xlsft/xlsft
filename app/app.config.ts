export default defineAppConfig({
    ui: {
        icons: {
            arrowDown: 'mingcute:down-line',
            arrowLeft: 'mingcute:left-line',
            arrowRight: 'mingcute:right-line',
            arrowUp: 'mingcute:up-line',
            caution: 'mingcute:alert-line',
            check: 'mingcute:check-line',
            chevronDoubleLeft: 'mingcute:arrows-left-line',
            chevronDoubleRight: 'mingcute:arrows-right-line',
            chevronDown: 'mingcute:down-line',
            chevronLeft: 'mingcute:left-line',
            chevronRight: 'mingcute:right-line',
            chevronUp: 'mingcute:up-line',
            close: 'mingcute:close-line',
            copy: 'mingcute:copy-2-line',
            copyCheck: 'mingcute:check-line',
            dark: 'mingcute:moon-line',
            light: 'mingcute:sun-line',
            ellipsis: 'mingcute:more-1-line',
            error: 'mingcute:close-circle-line',
            external: 'mingcute:external-link-line',
            eye: 'mingcute:eye-line',
            eyeOff: 'mingcute:eye-close-line',
            file: 'mingcute:file-line',
            folder: 'mingcute:folder-line',
            folderOpen: 'mingcute:folder-open-line',
            hash: 'mingcute:hashtag-line',
            info: 'mingcute:information-line',
            loading: 'mingcute:loading-3-line',
            menu: 'mingcute:menu-line',
            minus: 'mingcute:subtract-line',
            panelClose: 'mingcute:layout-rightbar-close-line',
            panelOpen: 'mingcute:layout-rightbar-open-line',
            plus: 'mingcute:add-line',
            reload: 'mingcute:refresh-anticlockwise-1-line',
            search: 'mingcute:search-line',
            stop: 'mingcute:stop-line',
            success: 'mingcute:check-circle-line',
            system: 'mingcute:settings-2-line',
            tip: 'mingcute:bulb-line',
            upload: 'mingcute:upload-line',
            warning: 'mingcute:warning-line'
        },
        formField: {
            slots: {
                label: 'text-xs text-default/50'
            }
        },
        button: {
            slots: {
                base: 'button text-nowrap'
            }
        },
        checkbox: {
            slots: {
                base: 'bg-muted',
                icon: 'scale-80'
            }
        },
        toast: {
            slots: {
                description: 'text-default/50!'
            }
        },
        badge: {
            slots: {
                base: 'transition-all'
            }
        }
    },
})