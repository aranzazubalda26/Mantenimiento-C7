# Patch notes · Mantenimiento C7

## 28/09/2026 · Rol supervisor/a, fuera de alcance y campanita de avisos

### Supervisor/a

- **Nueva pantalla de inicio: Tareas.** Es la lista de lo que hay que hacer, en el orden en que conviene hacerlo:
  - Arriba van las **reabiertas**, con el motivo a la vista.
  - Después, de urgente a baja. A igual prioridad, primero la más vieja.
  - Cada tarea muestra la foto del problema, la escuela, el lugar y hace cuánto se cargó.
  - Las urgentes llevan una franja roja a la izquierda.
  - Un **punto verde** marca las tareas nuevas o con cambios que todavía no abrió.
  - Arriba de la lista hay botones para **filtrar por escuela**.
  - Tres contadores: urgentes, pendientes y hechas en los últimos 7 días.
- **Barra de abajo:** Tareas · Escuelas · Hechas · Avisos. En la PC, el mismo menú en la barra lateral.
- **Detalle de la tarea:**
  - Las fotos del problema están primero, grandes, y se deslizan de costado.
  - Botón **"Cómo llegar"**: abre Google Maps con la dirección de la escuela.
  - El botón **"Marcar como terminada"** queda fijo abajo, al alcance del pulgar, sin tener que bajar hasta el final.
- **Terminar una tarea:** se abre una ventana desde abajo para sacar **al menos una foto del trabajo hecho** (obligatoria, hasta 5) y dejar una nota opcional para el inspector/a.
- **"No corresponde a mantenimiento…":** marca la tarea como **Fuera de alcance**, para lo que en realidad es obra y se factura aparte. El motivo es obligatorio.
- **Deshacer:** después de terminar una tarea o marcarla fuera de alcance, aparece un aviso con **"Deshacer" durante 10 segundos**. Si lo usás, la tarea vuelve a Pendiente como si nada, sin dejar registro en el historial.
- **"Vista":** la primera vez que el supervisor/a abre una tarea queda registrado en el historial. Así el inspector/a sabe que ya la vio.

### Inspector/a

- **Campanita de avisos** a la derecha de la barra de abajo, con el número de avisos sin leer. Te avisa cuando el supervisor/a termina una tarea (con la nota) o la marca fuera de alcance; este último aviso sale destacado.
- En la orden terminada se ven las **fotos del después** y la nota, en la sección "Trabajo terminado".
- Las órdenes **fuera de alcance** muestran el motivo y se pueden **reabrir con "Objetar y reabrir"**, igual que una terminada.
- El botón "+ Nueva orden" sigue en el centro de la barra. El cuarto lugar queda libre para sumar otra pantalla más adelante.

### Supervisor/a e inspector/a: avisos

- La pantalla **Avisos** muestra lo que hizo la otra parte en tus escuelas, agrupado por día:
  - al supervisor/a le llega cuando se carga, edita, reabre o borra una tarea;
  - al inspector/a, cuando se termina o se marca fuera de alcance.
- Las urgentes aparecen en rojo.
- Cada aviso dice qué pasó (qué se cambió, el motivo o la nota) y, si la orden cambió después, cuál es su estado actual.
- Tocar un aviso abre la orden y lo marca como leído. También hay un botón **"Marcar todo como leído"**.
- El número de la campanita se actualiza **en vivo** mientras la app está abierta y al volver a ella.

### Admin

- Nuevo filtro **"Fuera de alcance"** en Órdenes, con el motivo de cada una a la vista, para presupuestar aparte.
- Puede terminar tareas sin foto y marcarlas fuera de alcance.
- No tiene campanita: los avisos son entre supervisor/a e inspector/a.

### Cambios generales

- Estado nuevo **"Fuera de alcance"** (violeta) en etiquetas, listas, filtros de cada escuela e historial.
- Las reglas nuevas también las controla la base de datos, no solo la app:
  - solo el supervisor/a (o el admin) cierra;
  - la foto de cierre es obligatoria para el supervisor/a;
  - el motivo de fuera de alcance es obligatorio;
  - deshacer solo vale para quien cerró y dentro del tiempo;
  - cada uno ve y marca solo sus propios avisos.
- Al editar una orden, las fotos de cierre no se pueden tocar: solo las del problema.

### Para ponerlo en marcha

1. Aplicar la migración nueva: `npm run migrar` (archivo `supabase/migrations/20260928120000_supervisor_cierre_y_avisos.sql`).
2. Revisar en Supabase que **Realtime** esté activo para la tabla `avisos`. La migración la agrega a la publicación `supabase_realtime`. Si Realtime no está activo, la campanita igual se actualiza al navegar o al volver a la app, pero no en vivo.

### Pendiente de definir

- **Ciudad para "Cómo llegar":** hoy se busca la dirección en *Ciudad Autónoma de Buenos Aires*. Se cambia en `src/lib/navegacion.ts`.
- **Cuarto botón de la barra de la inspectora**, para que quede simétrica.
- **Para más adelante:** notificaciones push (que suene el celular con la app cerrada) y seguimiento de presupuesto o facturación de lo que quedó fuera de alcance.
