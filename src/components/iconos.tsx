// Iconos del diseño de referencia (trazo de 24px, heredan el color del texto)

type Props = { className?: string };

function Svg({ className = "size-5", children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconoInicio = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="4.5" rx="2" />
    <rect x="13" y="10.5" width="7" height="9.5" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
  </Svg>
);

export const IconoTareas = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M8.5 12l2.3 2.3L15.5 9.5" />
  </Svg>
);

export const IconoMas = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" strokeWidth="2" />
  </Svg>
);

export const IconoGente = (p: Props) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.5 3.5 5.2" />
  </Svg>
);

export const IconoEscuela = (p: Props) => (
  <Svg {...p}>
    <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5M12 11h.01" />
  </Svg>
);

export const IconoLugar = (p: Props) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);

export const IconoLupa = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4-4" />
  </Svg>
);

export const IconoMenu = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" strokeWidth="2" />
  </Svg>
);

export const IconoX = (p: Props) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" />
  </Svg>
);

export const IconoAtras = (p: Props) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" strokeWidth="2" />
  </Svg>
);

export const IconoCamara = (p: Props) => (
  <Svg {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </Svg>
);

export const IconoLlave = (p: Props) => (
  <Svg {...p}>
    <path
      d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"
      strokeWidth="2"
    />
  </Svg>
);

export const IconoAlerta = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4 2.8 19.5h18.4z" />
    <path d="M12 10v4M12 17h.01" />
  </Svg>
);

export const IconoCalendario = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
    <path d="M8 3.5v4M16 3.5v4M4 10.5h16" />
  </Svg>
);

export const IconoOk = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.3l2.7 2.7L16 9.7" strokeWidth="2" />
  </Svg>
);

export const IconoReloj = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconoSalir = (p: Props) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Svg>
);

export const IconoFlecha = (p: Props) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" strokeWidth="2" />
  </Svg>
);
