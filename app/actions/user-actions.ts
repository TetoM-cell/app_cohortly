'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function deleteAccountAction() {
  const supabase = await createClient();
  
  // 1. Get the current user to verify they are logged in
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'You must be logged in to delete your account.' };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Account deletion error: SUPABASE_SERVICE_ROLE_KEY is not configured.');
    return { error: 'Account deletion is not configured correctly. Please contact support.' };
  }

  // 2. Initialize the admin client
  const adminClient = createAdminClient();

  // 3. Delete user-owned cohorts explicitly before deleting the auth user.
  // Some environments may not have ON DELETE CASCADE on programs.owner_id.
  const { error: programsDeleteError } = await adminClient
    .from('programs')
    .delete()
    .eq('owner_id', user.id);

  if (programsDeleteError) {
    console.error('Account deletion cleanup error:', programsDeleteError);
    return { error: 'Failed to delete account data. Please try again later.' };
  }

  // 4. Delete the user from auth.users. This should cascade profile-linked records.
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Account deletion error:', deleteError);
    return { error: 'Failed to delete account. Please try again later.' };
  }

  // 5. Since the user is deleted, we should clear the session
  // In Next.js with cookies, we might need to manually sign out on the client side too
  // but the user will no longer have a valid session in the DB.

  return { success: true };
}
