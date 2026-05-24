-- Create DELETE policy for client on ai_tasks table
CREATE POLICY "ai_tasks_delete_client" ON public.ai_tasks
  FOR DELETE USING (client_wallet = public.get_wallet());
