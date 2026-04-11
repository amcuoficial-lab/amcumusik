import { createClient } from '@supabase/supabase-js';
import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const form = new IncomingForm({ maxFileSize: 500 * 1024 * 1024 }); // 500MB

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const sb = createClient(
        process.env.SUPABASE_URL || 'https://anvkreqmsbzsfaepudlx.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const folder  = fields.folder?.[0] || 'products';
      const name    = fields.name?.[0] || Date.now().toString();
      const file    = files.file?.[0];
      if (!file) return res.status(400).json({ error: 'No se recibió archivo' });

      const ext     = file.originalFilename?.split('.').pop() || 'bin';
      const path    = `${folder}/${Date.now()}_${name.replace(/\s+/g,'_')}.${ext}`;
      const buffer  = fs.readFileSync(file.filepath);

      const { error: upErr } = await sb.storage
        .from('amcu-files')
        .upload(path, buffer, { contentType: file.mimetype, upsert: true });

      fs.unlinkSync(file.filepath);

      if (upErr) return res.status(500).json({ error: upErr.message });

      const { data: { publicUrl } } = sb.storage.from('amcu-files').getPublicUrl(path);
      return res.status(200).json({ url: publicUrl });

    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  });
}
