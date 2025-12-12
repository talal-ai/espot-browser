import { supabase } from '../lib/supabase';

class SupabaseAdminService {
  async createAuthUser(payload: { email: string; password?: string; username?: string; role?: string }): Promise<{ user?: any }> {
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: payload });
    if (error) throw new Error(error.message || 'Failed to create Supabase user');
    return data as { user?: any };
  }
}

export const supabaseAdminService = new SupabaseAdminService();
export default supabaseAdminService;
