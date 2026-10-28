'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  NIVELES,
  esObjectIdValido,
  normalizarDatosEstudiante,
} = require('../index');

test('normaliza los espacios de los campos de texto', () => {
  const estudiante = normalizarDatosEstudiante({
    nombre: '  Ana Pérez  ',
    instrumento: ' Piano ',
    nivel: ' Principiante ',
    cancionFavorita: '  Sonata  ',
  });

  assert.deepEqual(estudiante, {
    nombre: 'Ana Pérez',
    instrumento: 'Piano',
    nivel: 'Principiante',
    cancionFavorita: 'Sonata',
  });
});

test('acepta los niveles definidos y rechaza otros valores', () => {
  assert.deepEqual(NIVELES, ['Principiante', 'Intermedio', 'Avanzado']);
  assert.throws(
    () =>
      normalizarDatosEstudiante({
        nombre: 'Ana',
        instrumento: 'Piano',
        nivel: 'Experto',
      }),
    /nivel debe ser uno de estos/,
  );
});

test('requiere los campos obligatorios', () => {
  assert.throws(
    () => normalizarDatosEstudiante({ nombre: 'Ana', nivel: 'Principiante' }),
    /instrumento.*obligatorio/,
  );
});

test('rechaza una fecha de inscripción inválida', () => {
  assert.throws(
    () =>
      normalizarDatosEstudiante({
        nombre: 'Ana',
        instrumento: 'Piano',
        nivel: 'Principiante',
        fechaInscripcion: 'no-es-una-fecha',
      }),
    /fecha de inscripción no es válida/,
  );
});

test('solo acepta ObjectId hexadecimales de 24 caracteres', () => {
  assert.equal(esObjectIdValido('507f1f77bcf86cd799439011'), true);
  assert.equal(esObjectIdValido('no-es-un-id'), false);
  assert.equal(esObjectIdValido('507f1f77bcf86cd79943901'), false);
});
