import { createContext, useContext, useState } from 'react'

const AppContext = createContext()

const CLOSED_CONFIRM = { isOpen: false, title: '', message: '', confirmLabel: 'Delete', onConfirm: null }

export function AppProvider({ children }) {
    const [confirmState, setConfirmState] = useState(CLOSED_CONFIRM)
    const [toasts, setToasts] = useState([])

    const showConfirm = (title, message, onConfirm, confirmLabel = 'Delete') => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            confirmLabel,
            onConfirm: () => {
                onConfirm()
                setConfirmState(CLOSED_CONFIRM)
            }
        })
    }

    const hideConfirm = () => setConfirmState(CLOSED_CONFIRM)

    const showToast = (message, type = 'info') => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev, { id, message, type }])
    }

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }

    return (
        <AppContext.Provider value={{ showConfirm, hideConfirm, confirmState, showToast, removeToast, toasts }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    return useContext(AppContext)
}
