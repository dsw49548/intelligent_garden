import { useEffect } from 'react'

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Delete' }) {
    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onCancel()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onCancel])

    if (!isOpen) return null

    return (
        <div className="modal_overlay" onClick={onCancel}>
            <div className="modal_card" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal_title">{title}</h3>
                {message && <p className="modal_message">{message}</p>}
                <div className="modal_actions">
                    <button className="btn_secondary" onClick={onCancel} autoFocus>
                        Cancel
                    </button>
                    <button className="btn_danger" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmModal
