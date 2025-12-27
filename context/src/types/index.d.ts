// Type definitions for Electron IPC
export interface GoogleUser {
    id: string;
    email: string;
    name: string;
    picture: string;
}

export interface AuthTokens {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
}

export interface Tab {
    id: string;
    url: string;
    title: string;
    favicon?: string;
}

// Extend Window interface with Electron API
declare global {
    interface Window {
        electronAPI: {
            // Auth APIs
            auth: {
                login: () => Promise<GoogleUser>;
                logout: () => Promise<void>;
                getUser: () => Promise<GoogleUser | null>;
                isAuthenticated: () => Promise<boolean>;
            };
            // Browser APIs
            browser: {
                navigate: (url: string) => Promise<void>;
                goBack: () => Promise<void>;
                goForward: () => Promise<void>;
                reload: () => Promise<void>;
                stop: () => Promise<void>;
            };
            // Tab APIs
            tabs: {
                create: (url?: string) => Promise<Tab>;
                close: (tabId: string) => Promise<void>;
                switch: (tabId: string) => Promise<void>;
                getAll: () => Promise<Tab[]>;
            };
        };
    }
}

export { };
