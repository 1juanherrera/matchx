export async function startMockServer() {
  if (import.meta.env.VITE_MOCK_API !== 'true') return

  // Si hay un SW viejo registrado, lo desregistra y recarga la página UNA vez
  // para que el navegador instale la versión nueva desde cero. Sin esto, los
  // handlers nuevos (ej: authHandlers) no se activan hasta el segundo reload.
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    const hadOld = regs.some(r => r.active?.scriptURL.includes('mockServiceWorker'))
    if (hadOld) {
      await Promise.all(regs.map(r => r.unregister()))
      window.location.reload()
      return
    }
  }

  // Import dinámico → el bundle de MSW NUNCA se incluye en producción
  const { worker } = await import('./browser')

  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      options: { updateViaCache: 'none' },
    },
  })

  console.info('[MSW] Mock server activo — VITE_MOCK_API=true')
}
