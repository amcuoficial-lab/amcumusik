const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SB_URL = 'https://anvkreqmsbzsfaepudlx.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudmtyZXFtc2J6c2ZhZXB1ZGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODIyODYsImV4cCI6MjA5MDQ1ODI4Nn0.mX58ZTWLgEXyYRk92RlwzaaFdmTxVn6PGygsnXDsHeY';
const sb = createClient(SB_URL, SB_KEY);

async function importDJs() {
  console.log('--- Iniciando Importación de DJs ---');
  
  const filePath = 'C:\\Users\\Escritorio\\Desktop\\Djs PROMOS LIST.xlsx';
  if (!fs.existsSync(filePath)) {
    console.error('No se encontró el archivo en:', filePath);
    return;
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`Leídos ${data.length} contactos del Excel.`);

  const formattedDJs = [];

  data.forEach((row, idx) => {
    // Lista de pares a intentar extraer de cada fila
    const candidates = [
      { email: row['Artist Email'], nombre: row['Artist Name'] },
      { email: row['Label Email'], nombre: row['Label Name'] || 'Label' },
      { email: row['Music Companies'], nombre: 'Music Company' },
      { email: row['__EMPTY_7'], nombre: row['Send Promos Too:'] }
    ];

    candidates.forEach(c => {
      if (!c.email) return;
      const emailStr = c.email.toString().trim().toLowerCase();
      const nombreStr = c.nombre ? c.nombre.toString().trim() : 'DJ';

      // Filtrar cabeceras y correos inválidos
      if (emailStr.includes('@') && 
          emailStr !== 'artist email' && 
          emailStr !== 'label email' && 
          emailStr !== 'artist email' &&
          !emailStr.includes('email@') &&
          nombreStr !== 'Artist Name' &&
          nombreStr !== 'Label Name') {
        
        // Evitar duplicados locales en la lista procesada
        if (!formattedDJs.some(dj => dj.email === emailStr)) {
          formattedDJs.push({
            email: emailStr,
            nombre: nombreStr,
            pais: row['Pais'] || row['pais'] || row['Country'] || row['country'] || null
          });
        }
      }
    });
  });

  console.log(`Procesados ${formattedDJs.length} contactos válidos.`);

  // Insertar en Supabase (usando upsert para no duplicar por email)
  const { data: result, error } = await sb
    .from('promos_djs')
    .upsert(formattedDJs, { onConflict: 'email' });

  if (error) {
    console.error('Error al subir a Supabase:', error.message);
  } else {
    console.log('✅ Importación completada correctamente.');
  }
}

importDJs();
