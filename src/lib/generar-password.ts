// Contraseña facil de dictar por telefono: sin 0/O, 1/l/I. Ej: "Kx7m-Pq4t-Zr9w"
const LETRAS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMEROS = "23456789";

export function generarPassword() {
  const azar = new Uint32Array(12);
  crypto.getRandomValues(azar); // disponible tambien fuera de https
  const bloque = (i: number) =>
    LETRAS[azar[i] % LETRAS.length] +
    LETRAS[azar[i + 1] % LETRAS.length] +
    NUMEROS[azar[i + 2] % NUMEROS.length] +
    LETRAS[azar[i + 3] % LETRAS.length];
  return `${bloque(0)}-${bloque(4)}-${bloque(8)}`;
}
