import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
    const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', confirmLabel: 'Delete', onConfirm: null })
    const [toasts, setToasts] = useState([])

    const showConfirm = useCallback((title, message, onConfirm, confirmLabel = 'Delete') => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            confirmLabel,
            onConfirm: () => {
                onConfirm()
                setConfirmState({ isOpen: false, title: '', message: '', confirmLabel: 'Delete', onConfirm: null })
            }
        })
    })

    const hideConfirm = useCallback(() => {
        setConfirmState({ isOpen: false, title: '', message: '', confirmLabel: 'Delete', onConfirm: null })
    })

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
    })

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    })

    return (
        <AppContext.Provider value={{ showConfirm, hideConfirm, confirmState, showToast, removeToast, toasts }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const context = useContext(AppContext)
    if (!context) {
        throw new Error('useApp must be used within AppProvider')
    }
    return context
}
