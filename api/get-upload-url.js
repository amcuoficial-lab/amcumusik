import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { folder, filename } = req.body;

  const sb = createClient(
    process.env.SUPABASE_URL || 'https://anvkreqmsbzsfaepudlx.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const path = `${folder}/${Date.now()}_${filename.replace(/\s+/g, '_')}`;

  const { data, error } = await sb.storage
    .from('amcu-files')
    .createSignedUploadUrl(path);

  if (error) return res.status(500).json({ error: error.message });

  const publicUrl = sb.storage.from('amcu-files').getPublicUrl(path).data.publicUrl;

  return res.status(200).json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl
  });
}
