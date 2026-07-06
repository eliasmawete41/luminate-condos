
DROP POLICY IF EXISTS "Autenticados criam conversas" ON public.conversations;
CREATE POLICY "Autenticados criam conversas" ON public.conversations
  FOR INSERT TO public
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Inserir participantes" ON public.conversation_participants;
CREATE POLICY "Inserir participantes" ON public.conversation_participants
  FOR INSERT TO public
  WITH CHECK (auth.uid() IS NOT NULL);
