const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
// Import the native Node.js DNS module
const dns = require("node:dns");
// For CommonJS use: const dns = require("node:dns");

// Set the DNS servers globally for this process to Cloudflare and Google
dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8"]);


const MONGO_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/nihongoApp';

// ==========================================
// 1. ESQUEMAS DE MONGOOSE
// ==========================================
const JpToEnSchema = new mongoose.Schema({
  _id: String, // Recibe el JP_SENTENCE_ID como String
  jpSentence: { type: String, required: true },
  enTranslations: [String]
}, { collection: 'jp_to_en' });

const EnToJpSchema = new mongoose.Schema({
  _id: String, // Recibe el EN_SENTENCE_ID como String
  enSentence: { type: String, required: true },
  jpTranslations: [String]
}, { collection: 'en_to_jp' });

const JpToEn = mongoose.model('JpToEn', JpToEnSchema);
const EnToJp = mongoose.model('EnToJp', EnToJpSchema);

// ==========================================
// 2. FUNCIÓN DE IMPORTACIÓN PROGRESIVA
// ==========================================
async function importData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const batchSize = 5000; // Tamaño óptimo por lote para bulkWrite

    // ------------------------------------------
    // PROCESAR: jp_to_en.json
    // ------------------------------------------
    if (fs.existsSync('jp_to_en.json')) {
      console.log('Reading jp_to_en.json...');
      const jpData = JSON.parse(fs.readFileSync('jp_to_en.json', 'utf8'));
      const jpEntries = Object.entries(jpData);
      console.log(`Total Japanese entries to process: ${jpEntries.length}`);

      let jpBatch = [];
      for (let i = 0; i < jpEntries.length; i++) {
        const [id, data] = jpEntries[i];

        // Mapeo exacto siguiendo tu documentación:
        // data['jp-sentence'] -> va a jpSentence
        // data['en-translations'] -> va a enTranslations
        jpBatch.push({
          updateOne: {
            filter: { _id: id },
            update: { 
              $set: { 
                jpSentence: data['jp-sentence'], 
                enTranslations: data['en-translations'] 
              } 
            },
            upsert: true
          }
        });

        // Ejecutar e inyectar lote en la Base de Datos
        if (jpBatch.length === batchSize || i === jpEntries.length - 1) {
          await JpToEn.bulkWrite(jpBatch);
          console.log(`Processed ${Math.min(i + 1, jpEntries.length)}/${jpEntries.length} JP entries`);
          jpBatch = []; // Vaciamos el lote para liberar memoria RAM inmediatamente
        }
      }
    } else {
      console.log('Warning: jp_to_en.json not found, skipping.');
    }

    // ------------------------------------------
    // PROCESAR: en_to_jp.json
    // ------------------------------------------
    if (fs.existsSync('en_to_jp.json')) {
      console.log('Reading en_to_jp.json...');
      const enData = JSON.parse(fs.readFileSync('en_to_jp.json', 'utf8'));
      const enEntries = Object.entries(enData);
      console.log(`Total English entries to process: ${enEntries.length}`);

      let enBatch = [];
      for (let i = 0; i < enEntries.length; i++) {
        const [id, data] = enEntries[i];

        // Mapeo exacto siguiendo tu documentación:
        // data['en-sentence'] -> va a enSentence
        // data['jp-translations'] -> va a jpTranslations
        enBatch.push({
          updateOne: {
            filter: { _id: id },
            update: { 
              $set: { 
                enSentence: data['en-sentence'], 
                jpTranslations: data['jp-translations'] 
              } 
            },
            upsert: true
          }
        });

        // Ejecutar e inyectar lote en la Base de Datos
        if (enBatch.length === batchSize || i === enEntries.length - 1) {
          await EnToJp.bulkWrite(enBatch);
          console.log(`Processed ${Math.min(i + 1, enEntries.length)}/${enEntries.length} EN entries`);
          enBatch = []; // Vaciamos el lote para liberar memoria RAM inmediatamente
        }
      }
    } else {
      console.log('Warning: en_to_jp.json not found, skipping.');
    }

    console.log('Import completed successfully!');
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

importData();