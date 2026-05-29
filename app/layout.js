import './globals.css';

export const metadata = {
  title: 'Rendición de Cuentas 2026 | San Pedro Valle',
  description: 'Sistema seguro de participación, trazabilidad, asignación y respuesta para la Rendición de Cuentas 2026.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
