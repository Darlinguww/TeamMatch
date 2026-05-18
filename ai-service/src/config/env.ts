/**
 * Obtiene una variable de entorno obligatoria.
 * Lanza un error descriptivo si no está definida.
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `La variable de entorno ${name} no está definida. Configúrala en el archivo .env antes de iniciar el servicio.`,
    );
  }
  return value;
}
