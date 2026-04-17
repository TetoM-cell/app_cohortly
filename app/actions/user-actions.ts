'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function deleteAccountAction() {
  const supabase = await createClient();
  
  // 1. Get the current user to verify they are logged in
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'You must be logged in to delete your account.' };
  }

  // 2. Initialize the admin client
  const adminClient = createAdminClient();

  // 3. Delete the user from auth.users
  // This will trigger the ON DELETE CASCADE on public.profiles and other tables
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Account deletion error:', deleteError);
    return { error: 'Failed to delete account. Please try again later.' };
  }

  // 4. Since the user is deleted, we should clear the session
  // In Next.js with cookies, we might need to manually sign out on the client side too
  // but the user will no longer have a valid session in the DB.

  return { success: true };
}
