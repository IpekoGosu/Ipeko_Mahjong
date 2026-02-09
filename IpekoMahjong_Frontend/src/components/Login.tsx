import React, { useState } from 'react'
import { User, LoginResponse, RegisterResponse } from '../types'

interface LoginProps {
    onLoginSuccess: (user: User, token: string) => void
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isRegistering, setIsRegistering] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        const endpoint = isRegistering ? '/user' : '/user/login'
        const url = `http://localhost:3000${endpoint}`

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
            })

            if (isRegistering) {
                const result = (await response.json()) as RegisterResponse
                if (!response.ok) {
                    throw new Error(result.message || 'Registration failed')
                }
                // After successful registration, switch to login
                setIsRegistering(false)
                setError('Registration successful! Please login.')
            } else {
                const result = (await response.json()) as LoginResponse
                if (!response.ok) {
                    throw new Error(result.message || 'Authentication failed')
                }
                // Login success
                // result.data contains jwt (accessToken, refreshToken) and user
                const token = result.data.jwt.accessToken
                const user = result.data.user
                
                onLoginSuccess(user, token)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-3xl shadow-2xl border border-gray-700">
                <h1 className="text-4xl font-black mb-2 text-center bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                    IPEKO MAHJONG
                </h1>
                <p className="text-gray-400 text-center mb-8 uppercase tracking-widest text-xs font-bold">
                    {isRegistering ? 'Create an account' : 'Welcome Back'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-gray-900 border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-blue-500 outline-none transition-all text-white font-medium"
                            placeholder="mahjong@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-gray-900 border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-blue-500 outline-none transition-all text-white font-medium"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className={error.includes('successful') ? "text-green-400 text-sm font-bold bg-green-400/10 p-3 rounded-xl border border-green-400/20" : "text-red-400 text-sm font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20"}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex justify-center items-center"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            isRegistering ? 'Register' : 'Login'
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-700 text-center">
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering)
                            setError(null)
                        }}
                        className="text-gray-400 hover:text-white text-sm font-bold transition-colors"
                    >
                        {isRegistering
                            ? 'Already have an account? Login'
                            : "Don't have an account? Register"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Login
