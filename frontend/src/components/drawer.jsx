import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const APP_VERSION = '1.0.0'
const SWIPE_THRESHOLD = 50
const HORIZONTAL_RATIO = 1.5

function Drawer({ isOpen, onClose, onOpen }) {
    const drawerRef = useRef(null)
    const touchStartRef = useRef(null)

    useEffect(() => {
        const handleTouchStart = (e) => {
            const touch = e.touches[0]
            touchStartRef.current = { x: touch.clientX, y: touch.clientY }
        }

        const handleTouchMove = (e) => {
            if (!touchStartRef.current) return

            const touch = e.touches[0]
            const deltaX = touch.clientX - touchStartRef.current.x
            const deltaY = touch.clientY - touchStartRef.current.y
            const absDeltaX = Math.abs(deltaX)
            const absDeltaY = Math.abs(deltaY)

            if (absDeltaX > 10 || absDeltaY > 10) {
                const isHorizontal = absDeltaX > absDeltaY * HORIZONTAL_RATIO

                if (isHorizontal) {
                    e.preventDefault()

                    if (isOpen && deltaX < 0) {
                        const translateX = Math.max(deltaX, -280)
                        if (drawerRef.current) {
                            drawerRef.current.style.transform = `translateX(${translateX}px)`
                        }
                    }
                }
            }
        }

        const handleTouchEnd = (e) => {
            if (!touchStartRef.current) return

            const touch = e.changedTouches[0]
            const deltaX = touch.clientX - touchStartRef.current.x
            const deltaY = touch.clientY - touchStartRef.current.y
            const absDeltaX = Math.abs(deltaX)
            const absDeltaY = Math.abs(deltaY)

            const isHorizontal = absDeltaX > absDeltaY * HORIZONTAL_RATIO

            if (isHorizontal && absDeltaX > SWIPE_THRESHOLD) {
                if (isOpen && deltaX < 0) {
                    onClose()
                } else if (!isOpen && deltaX > 0) {
                    if (onOpen) onOpen()
                }
            }

            if (drawerRef.current) {
                drawerRef.current.style.transform = ''
            }

            touchStartRef.current = null
        }

        document.addEventListener('touchstart', handleTouchStart, { passive: false })
        document.addEventListener('touchmove', handleTouchMove, { passive: false })
        document.addEventListener('touchend', handleTouchEnd)

        return () => {
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
            if (drawerRef.current) {
                drawerRef.current.style.transform = ''
            }
        }
    }, [isOpen, onClose, onOpen])

    if (!isOpen) return null

    return (
        <>
            <div className="drawer_overlay" onClick={onClose}></div>
            <div
                ref={drawerRef}
                className={`drawer ${isOpen ? 'drawer_open' : ''}`}
            >
                <div className="drawer_header">
                    <h2>Menu</h2>
                    <button className="drawer_close" onClick={onClose}>×</button>
                </div>
                <nav className="drawer_nav">
                    <Link to="/" onClick={onClose}>Plants</Link>
                    <Link to="/settings" onClick={onClose}>App Settings</Link>
                    <Link to="/about" onClick={onClose}>About</Link>
                </nav>
                <div className="drawer_footer">
                    <p>Version {APP_VERSION}</p>
                </div>
            </div>
        </>
    )
}

export default Drawer
