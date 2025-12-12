// Mock Data Service with localStorage persistence

const STORAGE_KEYS = {
  USERS: 'espot_users',
  PROXIES: 'espot_proxies',
  SESSIONS: 'espot_sessions',
  CREDENTIALS: 'espot_credentials',
  SERVICES: 'espot_services',
  GROUPS: 'espot_groups',
  BRANDING: 'espot_branding'
};

// Initialize default data
const initializeData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers = [
      { id: '1', name: 'John Doe', email: 'john@example.com', group: 'Sales', status: 'active', devices: 2, createdAt: '2025-01-15' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', group: 'Marketing', status: 'active', devices: 1, createdAt: '2025-01-20' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com', group: 'Support', status: 'inactive', devices: 0, createdAt: '2025-02-01' },
      { id: '4', name: 'Sarah Williams', email: 'sarah@example.com', group: 'Sales', status: 'active', devices: 3, createdAt: '2025-02-10' },
      { id: '5', name: 'Tom Brown', email: 'tom@example.com', group: 'Engineering', status: 'active', devices: 2, createdAt: '2025-03-01' }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.PROXIES)) {
    const defaultProxies = [
      { id: '1', name: 'US East Proxy', ip: '192.168.1.100', port: '8080', location: 'US East', status: 'active', assignedUsers: ['1', '2'] },
      { id: '2', name: 'EU West Proxy', ip: '192.168.1.101', port: '8080', location: 'EU West', status: 'active', assignedUsers: ['3'] },
      { id: '3', name: 'Asia Pacific Proxy', ip: '192.168.1.102', port: '8080', location: 'Asia', status: 'inactive', assignedUsers: [] },
      { id: '4', name: 'US West Proxy', ip: '192.168.1.103', port: '8080', location: 'US West', status: 'active', assignedUsers: ['4', '5'] }
    ];
    localStorage.setItem(STORAGE_KEYS.PROXIES, JSON.stringify(defaultProxies));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
    const defaultSessions = [
      { id: '1', userId: '1', userName: 'John Doe', device: 'Chrome - Windows', ip: '203.0.113.45', location: 'New York, USA', startTime: '2025-07-15 09:30', status: 'active' },
      { id: '2', userId: '1', userName: 'John Doe', device: 'Safari - MacOS', ip: '203.0.113.46', location: 'New York, USA', startTime: '2025-07-15 10:15', status: 'active' },
      { id: '3', userId: '2', userName: 'Jane Smith', device: 'Firefox - Linux', ip: '198.51.100.23', location: 'London, UK', startTime: '2025-07-15 08:00', status: 'active' },
      { id: '4', userId: '4', userName: 'Sarah Williams', device: 'Edge - Windows', ip: '192.0.2.67', location: 'Sydney, Australia', startTime: '2025-07-15 07:45', status: 'active' }
    ];
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(defaultSessions));
  }

  if (!localStorage.getItem(STORAGE_KEYS.CREDENTIALS)) {
    const defaultCredentials = [
      { id: '1', service: 'Gmail', username: 'admin@company.com', password: '••••••••', visibility: 'hidden', assignedUsers: ['1', '2', '4'] },
      { id: '2', service: 'Salesforce', username: 'sales@company.com', password: 'SalesPass123', visibility: 'visible', assignedUsers: ['1', '4'] },
      { id: '3', service: 'Slack', username: 'team@company.com', password: '••••••••', visibility: 'hidden', assignedUsers: ['1', '2', '3', '5'] },
      { id: '4', service: 'Zendesk', username: 'support@company.com', password: 'SupportPass456', visibility: 'visible', assignedUsers: ['3'] }
    ];
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(defaultCredentials));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
    const defaultServices = [
      { id: '1', name: 'Gmail', icon: 'Mail', url: 'https://mail.google.com', category: 'Email', status: 'active', users: 15 },
      { id: '2', name: 'Salesforce', icon: 'TrendingUp', url: 'https://salesforce.com', category: 'CRM', status: 'active', users: 8 },
      { id: '3', name: 'Slack', icon: 'MessageSquare', url: 'https://slack.com', category: 'Communication', status: 'active', users: 22 },
      { id: '4', name: 'Zendesk', icon: 'HelpCircle', url: 'https://zendesk.com', category: 'Support', status: 'active', users: 5 },
      { id: '5', name: 'Jira', icon: 'CheckSquare', url: 'https://jira.com', category: 'Project Management', status: 'inactive', users: 0 }
    ];
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(defaultServices));
  }

  if (!localStorage.getItem(STORAGE_KEYS.GROUPS)) {
    const defaultGroups = [
      { id: '1', name: 'Sales', members: 2, description: 'Sales team members' },
      { id: '2', name: 'Marketing', members: 1, description: 'Marketing department' },
      { id: '3', name: 'Support', members: 1, description: 'Customer support team' },
      { id: '4', name: 'Engineering', members: 1, description: 'Development team' }
    ];
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(defaultGroups));
  }

  if (!localStorage.getItem(STORAGE_KEYS.BRANDING)) {
    const defaultBranding = {
      companyName: 'Espot Browser',
      primaryColor: '#1976d2',
      secondaryColor: '#ff6b35',
      logo: null
    };
    localStorage.setItem(STORAGE_KEYS.BRANDING, JSON.stringify(defaultBranding));
  }
};

initializeData();

// Generic CRUD operations
export const getData = (key) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

export const saveData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const addItem = (key, item) => {
  const data = getData(key);
  const newItem = { ...item, id: Date.now().toString() };
  data.push(newItem);
  saveData(key, data);
  return newItem;
};

export const updateItem = (key, id, updates) => {
  const data = getData(key);
  const index = data.findIndex(item => item.id === id);
  if (index !== -1) {
    data[index] = { ...data[index], ...updates };
    saveData(key, data);
    return data[index];
  }
  return null;
};

export const deleteItem = (key, id) => {
  const data = getData(key);
  const filtered = data.filter(item => item.id !== id);
  saveData(key, filtered);
  return true;
};

export { STORAGE_KEYS };