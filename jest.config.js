/** @type {import('ts-jest').JestConfigWithTsDeps} */
module.exports = {
  // Usa ts-jest para transformar tus archivos de pruebas (.test.ts)
  preset: 'ts-jest',

  // Entorno de ejecución para tu backend/entidades
  testEnvironment: 'node',

  // Patrón para buscar tus archivos de prueba
  testMatch: ['**/*.test.ts'],
}