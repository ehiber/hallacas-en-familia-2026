# DESIGN.md — Hallacas en Familia 2026

## 1. Dirección Visual y Concepto
Reemplazar la paleta actual predominantemente naranja/ámbar por una estética **navideña venezolana moderna, cálida y refinada**, inspirada en los colores reales de la hallaca:
- **Verde Hoja de Plátano (Primario):** Elegante, profundo y festivo (`emerald-800`, `emerald-900`, `emerald-700`).
- **Crema / Pergamino (Fondo):** Limpio y descansado a la vista (`stone-50`, `bg-[#FAF9F6]`), evitando fondos amarillos/naranjas saturados.
- **Rojo Navideño / Vino (Acentos festivos y alertas):** (`red-700`, `rose-600`) usado con moderación en detalles, badges festivos y estados de deuda.
- **Dorado Onoto (Acento secundario):** (`amber-500`, `amber-600`) solo para detalles sutiles (íconos, badges de merma, resaltados), nunca como color dominante de toda la interfaz.

---

## 2. Paleta de Colores (Tailwind CSS v4)

| Rol | Clases Tailwind | Uso |
|---|---|---|
| **Fondo general** | `bg-stone-50` | Body y contenedor principal |
| **Superficies / Cards** | `bg-white border border-stone-200/80 shadow-sm` | Tarjetas de grupos, listas y tablas |
| **Header principal** | `bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white` | Cabecera con sensación premium y festiva |
| **Botón primario** | `bg-emerald-700 hover:bg-emerald-800 text-white` | Acciones principales (Agregar, Guardar, Entrar) |
| **Botón WhatsApp** | `bg-emerald-600 hover:bg-emerald-700 text-white` | Botones de copiado/exportación |
| **Tab activa** | `bg-emerald-800 text-white shadow-sm` | Navegación principal |
| **Tab inactiva** | `bg-white text-stone-600 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200` | Navegación principal |
| **Badge positivo / A favor** | `bg-emerald-50 text-emerald-700 border border-emerald-200` | Balances positivos, ítems incluidos |
| **Badge negativo / Debe** | `bg-rose-50 text-rose-700 border border-rose-200` | Balances negativos, errores |
| **Badge Merma / Tasa Bs** | `bg-amber-50 text-amber-800 border border-amber-200` | Avisos de merma y tasa congelada |

---

## 3. Tipografía y Números
- Mantener la fuente sans-serif limpia del sistema con `antialiased`.
- Aplicar **`tabular-nums`** a todos los montos en `$`, `Bs`, porcentajes, contadores de hallacas/bollos y tablas financieras para que los números queden perfectamente alineados y no salten al editarse.
- Títulos de sección en `font-bold tracking-tight text-stone-800`.
- Etiquetas secundarias y subtítulos en `text-xs font-medium text-stone-500`.

---

## 4. Componentes Clave

### Pantalla de Acceso (Password Gate)
- Fondo sutil festivo: `bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900`.
- Tarjeta central blanca con `rounded-3xl shadow-2xl border border-white/10 p-8`.
- Ícono superior en contenedor `bg-emerald-100 text-emerald-800 rounded-2xl`.
- Input con foco `focus:ring-2 focus:ring-emerald-600`.

### Header y KPIs
- Header con efecto sutil de profundidad (`shadow-lg`) y tarjetas KPI internas translúcidas (`bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl`).
- Indicador de sincronización en vivo con punto verde esmeralda brillante (`bg-emerald-400`) y animación `animate-pulse`.
- Input de tasa de cambio integrado en pill translúcida (`bg-white/15 backdrop-blur-sm`).

### Tarjetas de Grupos Familiares
- `rounded-2xl bg-white border border-stone-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200`.
- Controles `+/-` táctiles y cómodos para móvil (`min-w-8 min-h-8`), con botón `+` en `bg-emerald-50 hover:bg-emerald-100 text-emerald-800` y `-` en `bg-stone-100 hover:bg-stone-200 text-stone-700`.

### Lista de Compras y Checklist
- Encabezados de categoría con barra lateral sutil o fondo `bg-stone-50/90 text-stone-700 font-bold uppercase tracking-wider text-xs`.
- Ítems marcados como comprados: transición suave de opacidad (`opacity-60`) y tachado (`line-through text-stone-400`).
- Checkbox estilizado con `accent-emerald-700`.

### Liquidación Inteligente (Splitwise)
- Tarjetas de transferencia con borde izquierdo destacado (`border-l-4 border-l-emerald-600 bg-emerald-50/50`) y flecha animada sutilmente al hacer hover.

---

## 5. Animaciones y Micro-interacciones
Agregar en `src/index.css` utilidades de animación suaves y aplicarlas en `src/App.jsx`:

1. **Transición de entrada de pestañas (`animate-fade-in`):**
   - Al cambiar entre *Grupos*, *Lista de Compras*, *Otras Compras* y *División*, el contenido debe aparecer con un `fade + translateY(6px)` de `200ms ease-out`.
2. **Feedback táctil en botones:**
   - Todos los botones interactivos (`+/-`, Tabs, Guardar, Copiar) deben llevar `active:scale-95 transition-all duration-150`.
3. **Toast de confirmación (WhatsApp copiado):**
   - Entrada suave desde abajo (`animate-slide-up`) con sombra elevada y fondo `bg-emerald-900 text-white`.
4. **Hover sutil en tarjetas y filas:**
   - Filas de ingredientes y tablas con `hover:bg-stone-50/80 transition-colors duration-150`.
5. **Respeto por accesibilidad:**
   - Envolver animaciones personalizadas en `@media (prefers-reduced-motion: no-preference)`.

### Keyframes sugeridos para `src/index.css`:
```css
@import "tailwindcss";

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeInUp 0.22s ease-out forwards;
}

.animate-slide-up {
  animation: fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

```

---

## 6. Reglas Estrictas para la Implementación

* **NO modificar** la lógica de Firebase, rutas de Firestore (`artifacts/${appId}/public/data/...`), autenticación anónima ni las fórmulas de cálculo de ingredientes, merma, tasas congeladas o Splitwise.
* **NO eliminar** ninguna funcionalidad existente (edición en línea de nombres, `CountInput`, modo facturas vs. ítems, Otras Compras, exportación WhatsApp).
* Mantener diseño **100% responsive (mobile-first)** pensado para usarse principalmente desde teléfonos en el mercado y en reuniones familiares.
