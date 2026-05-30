const express = require('express');
const mongoose = require('mongoose');
const dns = require("node:dns");
// For CommonJS use: const dns = require("node:dns");

// Set the DNS servers globally for this process to Cloudflare and Google
dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8"]);
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend (HTML, CSS, JS)
app.use(express.static(__dirname));

// Ruta principal para servir index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Ruta para servir history.html
app.get('/history', (req, res) => {
  res.sendFile(__dirname + '/history.html');
});

const MONGO_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/nihongoApp';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Schemas con Índices ---
const JpToEnSchema = new mongoose.Schema({
  _id: String,
  jpSentence: { type: String, index: true },
  enTranslations: [String]
}, { collection: 'jp_to_en' });

const EnToJpSchema = new mongoose.Schema({
  _id: String,
  enSentence: String,
  jpTranslations: { type: [String], index: true }
}, { collection: 'en_to_jp' });

const CompletedSchema = new mongoose.Schema({
  originalId: String,
  type: { type: String, enum: ['JP_EN', 'EN_JP'], index: true },
  sentence: { type: String, index: true },
  answer: String,
  correctAnswers: [String],
  status: { type: String, enum: ['correct', 'incorrect'] },
  createdAt: { type: Date, default: Date.now, index: true }
}, { collection: 'completed_sentences' });

const JpToEn = mongoose.model('JpToEn', JpToEnSchema);
const EnToJp = mongoose.model('EnToJp', EnToJpSchema);
const Completed = mongoose.model('Completed', CompletedSchema);

// --- Módulos ---
const ModuleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  pattern: { type: String, required: true },
  type: { type: String, enum: ['JP_EN', 'EN_JP'], default: 'JP_EN' },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'study_modules' });

const StudyModule = mongoose.model('StudyModule', ModuleSchema);

// --- API Routes ---

// Módulos: Obtener todos CON conteo optimizado
app.get('/api/modules', async (req, res) => {
  try {
    const modules = await StudyModule.find().sort({ createdAt: 1 }).lean();
    
    // Optimizamos: Calculamos todos los conteos en paralelo en el servidor
    const modulesWithCounts = await Promise.all(modules.map(async (m) => {
      const Model = m.type === 'JP_EN' ? JpToEn : EnToJp;
      const searchField = m.type === 'JP_EN' ? 'jpSentence' : 'jpTranslations';
      const count = await Model.countDocuments({ [searchField]: { $regex: m.pattern, $options: 'i' } });
      return { ...m, totalPending: count };
    }));

    res.json(modulesWithCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Módulos: Crear uno nuevo
app.post('/api/modules', async (req, res) => {
  try {
    const { title, pattern, type } = req.body;
    const newModule = await StudyModule.create({ title, pattern, type });
    res.json(newModule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Módulos: Eliminar
app.delete('/api/modules/:id', async (req, res) => {
  try {
    await StudyModule.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Search & Filter
app.get('/api/sentences/filter', async (req, res) => {
  try {
    const { pattern, type, limit } = req.query;
    const Model = type === 'JP_EN' ? JpToEn : EnToJp;
    
    const searchField = type === 'JP_EN' ? 'jpSentence' : 'jpTranslations';
    const query = pattern ? { [searchField]: { $regex: pattern, $options: 'i' } } : {};
    
    const totalCount = await Model.countDocuments(query);
    const sessionLimit = parseInt(limit) || 10;
    
    const sentences = await Model.find(query).limit(sessionLimit);
    res.json({ sentences, totalCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Complete Exercise (Transfer Logic)
app.post('/api/sentences/complete', async (req, res) => {
  const { originalId, type, sentence, answer, correctAnswers, status } = req.body;
  try {
    // Save to Completed
    await Completed.create({ originalId, type, sentence, answer, correctAnswers, status });
    // Remove from original collection
    const Model = type === 'JP_EN' ? JpToEn : EnToJp;
    await Model.findByIdAndDelete(originalId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Manual Deletion
app.delete('/api/sentences/:id', async (req, res) => {
  const { type } = req.query;
  try {
    const Model = type === 'JP_EN' ? JpToEn : EnToJp;
    await Model.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. History (Con filtros)
app.get('/api/history', async (req, res) => {
  const { limit, type, pattern } = req.query;
  const sessionLimit = parseInt(limit) || 20;
  
  try {
    let query = {};
    if (type && type !== 'ALL') {
      query.type = type;
    }
    if (pattern) {
      query.$or = [
        { sentence: { $regex: pattern, $options: 'i' } },
        { answer: { $regex: pattern, $options: 'i' } },
        { correctAnswer: { $regex: pattern, $options: 'i' } }
      ];
    }

    const history = await Completed.find(query).sort({ createdAt: -1 }).limit(sessionLimit);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
