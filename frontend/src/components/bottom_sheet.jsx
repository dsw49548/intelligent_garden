function BottomSheet({ isOpen, onClose, children }) {
    if (!isOpen) return null

    return (
        <>
            <div className="bottom_sheet_overlay" onClick={onClose}></div>
            <div className="bottom_sheet">
                <div className="bottom_sheet_handle"></div>
                <div className="bottom_sheet_content">
                    {children}
                </div>
            </div>
        </>
    )
}

export default BottomSheet
