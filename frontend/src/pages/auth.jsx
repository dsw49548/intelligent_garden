import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, register } from '../api.js'
import { saveAuth } from '../storage.js'

function Auth({ mode }) {
    const isRegister = mode === 'register'
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [busy, setBusy] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            const data = isRegister ? await register(username, password) : await login(username, password)
            saveAuth(data.token, data.user.username)
            navigate('/')
        } catch (err) {
            setError(err.status ? err.message : 'Cannot connect to server')
            setBusy(false)
        }
    }

    return (
        <div className="card">
            <h2 className="card_title">{isRegister ? 'Create account' : 'Log in'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="form_group">
                    <label htmlFor="username" className="label">Username</label>
                    <input
                        id="username"
                        type="text"
                        className="input"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form_group">
                    <label htmlFor="password" className="label">Password</label>
                    <input
                        id="password"
                        type="password"
                        className="input"
                        autoComplete={isRegister ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {isRegister && (
                        <div className="auth_hint">Username 3-30 characters, password at least 6.</div>
                    )}
                </div>
                {error && <div className="error_message">{error}</div>}
                <div className="form_actions">
                    <button type="submit" className="btn_primary" disabled={busy}>
                        {isRegister ? 'Create account' : 'Log in'}
                    </button>
                </div>
            </form>
            <p className="auth_switch">
                {isRegister ? 'Already have an account? ' : 'No account yet? '}
                <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create one'}</Link>
            </p>
        </div>
    )
}

export default Auth
