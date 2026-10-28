'use strict';

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

class ErrorDeEntrada extends Error {}

const NIVELES = Object.freeze(['Principiante', 'Intermedio', 'Avanzado']);
const DB_NAME_ESPERADA = 'escuela_musica';
const CAMPOS_ESTUDIANTE = new Set([
  'nombre',
  'instrumento',
  'nivel',
  'cancionFavorita',
  'fechaInscripcion',
]);

const estudianteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio.'],
      trim: true,
    },
    instrumento: {
      type: String,
      required: [true, 'El instrumento es obligatorio.'],
      trim: true,
    },
    nivel: {
      type: String,
      required: [true, 'El nivel es obligatorio.'],
      enum: {
        values: NIVELES,
        message: `El nivel debe ser uno de estos: ${NIVELES.join(', ')}.`,
      },
      trim: true,
    },
    cancionFavorita: {
      type: String,
      trim: true,
      default: '',
    },
    fechaInscripcion: {
      type: Date,
      required: [true, 'La fecha de inscripción es obligatoria.'],
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'estudiantes',
  },
);

const Estudiante = mongoose.model('Estudiante', estudianteSchema, 'estudiantes');

const estudiantesDePrueba = [
  {
    nombre: 'Lucía Fernández',
    instrumento: 'Piano',
    nivel: 'Principiante',
    cancionFavorita: 'Claro de luna',
  },
  {
    nombre: 'Mateo Rodríguez',
    instrumento: 'Guitarra',
    nivel: 'Intermedio',
    cancionFavorita: 'Blackbird',
  },
  {
    nombre: 'Sofía Martínez',
    instrumento: 'Violín',
    nivel: 'Avanzado',
    cancionFavorita: 'Las cuatro estaciones',
  },
  {
    nombre: 'Diego López',
    instrumento: 'Batería',
    nivel: 'Principiante',
    cancionFavorita: 'We Will Rock You',
  },
  {
    nombre: 'Valentina García',
    instrumento: 'Flauta',
    nivel: 'Intermedio',
    cancionFavorita: 'My Heart Will Go On',
  },
];

function normalizarDatosEstudiante(datos, { parcial = false } = {}) {
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new ErrorDeEntrada('El cuerpo de la solicitud debe ser un objeto JSON.');
  }

  const normalizados = {};
  const camposTexto = ['nombre', 'instrumento', 'nivel', 'cancionFavorita'];

  for (const campo of Object.keys(datos)) {
    if (!CAMPOS_ESTUDIANTE.has(campo)) {
      throw new ErrorDeEntrada(`El campo "${campo}" no está permitido.`);
    }
  }

  for (const campo of camposTexto) {
    if (!Object.hasOwn(datos, campo) || datos[campo] === undefined) {
      continue;
    }
    if (typeof datos[campo] !== 'string') {
      throw new ErrorDeEntrada(`El campo "${campo}" debe ser texto.`);
    }
    normalizados[campo] = datos[campo].trim();
  }

  for (const campo of ['nombre', 'instrumento', 'nivel']) {
    if (!parcial && !Object.hasOwn(normalizados, campo)) {
      throw new ErrorDeEntrada(`El campo "${campo}" es obligatorio.`);
    }
    if (Object.hasOwn(normalizados, campo) && normalizados[campo] === '') {
      throw new ErrorDeEntrada(`El campo "${campo}" no puede estar vacío.`);
    }
  }

  if (
    Object.hasOwn(normalizados, 'nivel') &&
    !NIVELES.includes(normalizados.nivel)
  ) {
    throw new ErrorDeEntrada(`El nivel debe ser uno de estos: ${NIVELES.join(', ')}.`);
  }

  if (Object.hasOwn(datos, 'fechaInscripcion')) {
    const fecha = new Date(datos.fechaInscripcion);
    if (Number.isNaN(fecha.getTime())) {
      throw new ErrorDeEntrada('La fecha de inscripción no es válida.');
    }
    normalizados.fechaInscripcion = fecha;
  }

  return normalizados;
}

function esObjectIdValido(id) {
  return typeof id === 'string' && mongoose.isObjectIdOrHexString(id);
}

function mensajeSeguro(error) {
  return String(error?.message || 'Error desconocido.')
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, '[URI oculta]')
    .replace(/(password|passwd|pwd)=([^&\s]+)/gi, '$1=[oculto]');
}

function validarConfiguracion() {
  const dbName = process.env.DB_NAME?.trim();
  const uri = process.env.MONGODB_URI?.trim();

  if (dbName !== DB_NAME_ESPERADA) {
    throw new Error(`DB_NAME debe ser exactamente "${DB_NAME_ESPERADA}".`);
  }
  if (!uri) {
    throw new Error(
      'Falta MONGODB_URI. Añade la URI real de tu clúster de MongoDB Atlas en el archivo .env.',
    );
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('MONGODB_URI debe comenzar con mongodb:// o mongodb+srv://.');
  }

  return { dbName, uri };
}

async function conectarAtlas() {
  const { dbName, uri } = validarConfiguracion();

  console.log(`Conectando con MongoDB Atlas (base de datos: ${dbName})...`);
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  console.log('Conexión establecida correctamente.');
}

async function cargarDatosIniciales() {
  if (await Estudiante.exists({})) {
    console.log('Ya hay estudiantes registrados; se conservan los datos existentes.');
    return;
  }

  const insertados = await Estudiante.insertMany(estudiantesDePrueba, {
    ordered: true,
  });
  console.log(`Se insertaron ${insertados.length} estudiantes de prueba.`);
}

function crearAplicacion() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (req, res) => {
    res.json({
      estado: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
      baseDeDatos: DB_NAME_ESPERADA,
    });
  });

  app.get('/api/estudiantes', async (req, res) => {
    const estudiantes = await Estudiante.find().sort({ nombre: 1 }).exec();
    res.json(estudiantes);
  });

  app.post('/api/estudiantes', async (req, res) => {
    const datos = normalizarDatosEstudiante(req.body);
    const estudiante = await Estudiante.create(datos);
    res.status(201).json(estudiante);
  });

  app.get('/api/estudiantes/:id', async (req, res) => {
    const { id } = req.params;
    if (!esObjectIdValido(id)) {
      return res.status(400).json({ error: 'El ID no es un ObjectId válido.' });
    }

    const estudiante = await Estudiante.findById(id).exec();
    if (!estudiante) {
      return res.status(404).json({ error: 'No se encontró el estudiante.' });
    }
    return res.json(estudiante);
  });

  app.put('/api/estudiantes/:id', async (req, res) => {
    const { id } = req.params;
    if (!esObjectIdValido(id)) {
      return res.status(400).json({ error: 'El ID no es un ObjectId válido.' });
    }

    const datos = normalizarDatosEstudiante(req.body);
    const estudiante = await Estudiante.findByIdAndUpdate(id, datos, {
      new: true,
      runValidators: true,
    }).exec();
    if (!estudiante) {
      return res.status(404).json({ error: 'No se encontró el estudiante.' });
    }
    return res.json(estudiante);
  });

  app.patch('/api/estudiantes/:id', async (req, res) => {
    const { id } = req.params;
    if (!esObjectIdValido(id)) {
      return res.status(400).json({ error: 'El ID no es un ObjectId válido.' });
    }
    if (
      req.body === null ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body) ||
      Object.keys(req.body).length === 0
    ) {
      return res.status(400).json({ error: 'Envía al menos un campo para actualizar.' });
    }

    const datos = normalizarDatosEstudiante(req.body, { parcial: true });
    const estudiante = await Estudiante.findByIdAndUpdate(id, datos, {
      new: true,
      runValidators: true,
    }).exec();
    if (!estudiante) {
      return res.status(404).json({ error: 'No se encontró el estudiante.' });
    }
    return res.json(estudiante);
  });

  app.delete('/api/estudiantes/:id', async (req, res) => {
    const { id } = req.params;
    if (!esObjectIdValido(id)) {
      return res.status(400).json({ error: 'El ID no es un ObjectId válido.' });
    }

    const estudiante = await Estudiante.findByIdAndDelete(id).exec();
    if (!estudiante) {
      return res.status(404).json({ error: 'No se encontró el estudiante.' });
    }
    return res.json({
      mensaje: 'Estudiante eliminado correctamente.',
      estudiante,
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error instanceof mongoose.Error.ValidationError) {
      const errores = Object.values(error.errors).map((detalle) => detalle.message);
      return res.status(400).json({ error: errores.join(' ') });
    }
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ error: 'Uno de los valores enviados no es válido.' });
    }
    if (error instanceof ErrorDeEntrada) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({ error: 'El cuerpo enviado no contiene JSON válido.' });
    }
    if (error.status === 413) {
      return res.status(413).json({ error: 'El cuerpo de la solicitud supera el límite permitido.' });
    }
    console.error('Error de API:', mensajeSeguro(error));
    return res.status(500).json({ error: 'Error interno al procesar la solicitud.' });
  });

  return app;
}

async function iniciarServidor() {
  let server;
  let cerrando = false;

  try {
    await conectarAtlas();
    await cargarDatosIniciales();

    const app = crearAplicacion();
    const puerto = Number(process.env.PORT || 3000);
    if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
      throw new Error('PORT debe ser un número entero entre 1 y 65535.');
    }

    server = await new Promise((resolve, reject) => {
      const httpServer = app.listen(puerto, () => resolve(httpServer));
      httpServer.once('error', reject);
    });
    console.log(`API lista en http://localhost:${puerto}`);
    console.log('Prueba GET http://localhost:%d/api/estudiantes', puerto);

    const cerrar = async (senal) => {
      if (cerrando) return;
      cerrando = true;
      console.log(`\nSe recibió ${senal}. Cerrando servidor y conexión...`);
      try {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
        await mongoose.disconnect();
        console.log('Servidor y conexión con MongoDB cerrados.');
      } catch (error) {
        console.error('No se pudo cerrar correctamente:', error.message);
        process.exitCode = 1;
      }
    };

    process.once('SIGINT', () => void cerrar('Ctrl+C'));
    process.once('SIGTERM', () => void cerrar('SIGTERM'));
  } catch (error) {
    console.error(`No se pudo iniciar el sistema: ${mensajeSeguro(error)}`);
    process.exitCode = 1;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  iniciarServidor();
}

module.exports = {
  Estudiante,
  NIVELES,
  crearAplicacion,
  esObjectIdValido,
  normalizarDatosEstudiante,
};
