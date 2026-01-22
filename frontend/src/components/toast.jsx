import { useEffect, useState } from 'react'

function Toast({ id, message, type = 'info', onClose }) {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(() => onClose(id), 300)
        }, 3000)

        return () => clearTimeout(timer)
    }, [id, onClose])

    return (
        <div className={`toast toast_${type} ${isVisible ? 'toast_visible' : ''}`}>
            {message}
        </div>
    )
}

function ToastHost({ toasts, removeToast }) {
    if (toasts.length === 0) return null

    return (
        <div className="toast_container">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={removeToast}
                />
            ))}
        </div>
    )
}

export default ToastHost
