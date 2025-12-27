import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import BrowserView from './components/BrowserView';
import './styles/index.css';

interface GoogleUser {
    id: string;
    email: string;
    name: string;
    picture: string;
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const authenticated = await window.electronAPI.auth.isAuthenticated();
            setIsAuthenticated(authenticated);

            if (authenticated) {
                const userData = await window.electronAPI.auth.getUser();
                setUser(userData);
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        try {
            setIsLoading(true);
            const userData = await window.electronAPI.auth.login();
            setUser(userData);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Login error:', error);
            alert('Failed to login. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await window.electronAPI.auth.logout();
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-full h-full">
                <div className="flex flex-col items-center gap-md">
                    <div
                        className="animate-spin"
                        style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid var(--bg-tertiary)',
                            borderTopColor: 'var(--accent-primary)',
                            borderRadius: '50%',
                        }}
                    />
                    <p className="text-secondary">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            {isAuthenticated && user ? (
                <BrowserView user={user} onLogout={handleLogout} />
            ) : (
                <LoginPage onLogin={handleLogin} />
            )}
        </div>
    );
}

export default App;
