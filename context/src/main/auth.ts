const { BrowserWindow } = require('electron');
const { createClient } = require('@supabase/supabase-js');

interface UserData {
    id: string;
    email: string;
    name: string;
    picture: string;
}

class SupabaseAuth {
    private supabase: any;
    private authWindow: typeof BrowserWindow | null = null;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

        this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                flowType: 'pkce',
                autoRefreshToken: true,
                detectSessionInUrl: true,
                persistSession: true,
            }
        });
    }

    async login(): Promise<UserData> {
        return new Promise((resolve, reject) => {
            // 🔑 SECRET #1: Create stealth browser window with Chrome user agent
            this.authWindow = new BrowserWindow({
                width: 600,
                height: 700,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    // Pretend to be Chrome
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                title: 'Sign in with Google',
            });

            // 🔑 SECRET #2: Inject stealth headers to bypass detection
            this.authWindow.webContents.session.webRequest.onBeforeSendHeaders((details: any, callback: any) => {
                details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.9';
                details.requestHeaders['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
                details.requestHeaders['Sec-Ch-Ua-Mobile'] = '?0';
                details.requestHeaders['Sec-Ch-Ua-Platform'] = '"Windows"';
                details.requestHeaders['Sec-Fetch-Site'] = 'none';
                details.requestHeaders['Sec-Fetch-Mode'] = 'navigate';
                details.requestHeaders['Sec-Fetch-User'] = '?1';
                details.requestHeaders['Sec-Fetch-Dest'] = 'document';
                callback({ requestHeaders: details.requestHeaders });
            });

            // 🔑 SECRET #3: Remove Electron traces from the page
            this.authWindow.webContents.on('did-finish-load', () => {
                this.authWindow?.webContents.executeJavaScript(`
                    // Remove Electron-specific objects
                    delete window.require;
                    delete window.exports;
                    delete window.module;
                    delete window.process;
                    
                    // Override navigator properties to look like Chrome
                    Object.defineProperty(navigator, 'platform', {
                        get: () => 'Win32'
                    });
                    
                    Object.defineProperty(navigator, 'vendor', {
                        get: () => 'Google Inc.'
                    });
                    
                    Object.defineProperty(navigator, 'userAgent', {
                        get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    });
                    
                    // Add Chrome-specific properties
                    if (!window.chrome) {
                        window.chrome = {
                            runtime: {},
                            loadTimes: function() {},
                            csi: function() {},
                            app: {}
                        };
                    }
                `).catch((err: any) => console.error('Failed to inject stealth script:', err));
            });

            // Start Google OAuth flow
            this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'http://localhost:3000/auth/callback',
                    skipBrowserRedirect: true,
                }
            }).then((response: any) => {
                if (response.data?.url) {
                    // Load the OAuth URL in the stealth window
                    this.authWindow?.loadURL(response.data.url);

                    // Listen for navigation to capture the callback
                    this.authWindow?.webContents.on('will-redirect', async (_event: any, url: string) => {
                        if (url.includes('/auth/callback')) {
                            // Extract the code from URL
                            const urlParams = new URL(url).searchParams;
                            const code = urlParams.get('code');

                            if (code) {
                                try {
                                    // Exchange code for session
                                    const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);

                                    if (error) throw error;

                                    if (data.user) {
                                        const userData: UserData = {
                                            id: data.user.id,
                                            email: data.user.email || '',
                                            name: data.user.user_metadata?.full_name || data.user.email || '',
                                            picture: data.user.user_metadata?.avatar_url || '',
                                        };

                                        this.authWindow?.close();
                                        resolve(userData);
                                    } else {
                                        reject(new Error('No user data received'));
                                    }
                                } catch (error) {
                                    this.authWindow?.close();
                                    reject(error);
                                }
                            }
                        }
                    });

                    // Handle window close
                    this.authWindow?.on('closed', () => {
                        this.authWindow = null;
                        reject(new Error('Authentication window closed'));
                    });
                } else {
                    reject(new Error('Failed to get OAuth URL'));
                }
            }).catch((error: any) => {
                reject(error);
            });
        });
    }

    async logout(): Promise<void> {
        try {
            await this.supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }

    async getUser(): Promise<UserData | null> {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();

            if (error) throw error;

            if (user) {
                return {
                    id: user.id,
                    email: user.email || '',
                    name: user.user_metadata?.full_name || user.email || '',
                    picture: user.user_metadata?.avatar_url || '',
                };
            }

            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error) throw error;

            return !!session;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    }

    // Get Supabase client for other operations
    getClient() {
        return this.supabase;
    }
}

module.exports = { SupabaseAuth };

export { };
