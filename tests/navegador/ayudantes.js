// Utilidades compartidas por las pruebas de navegador.

/** Genera una foto de prueba en el navegador (como las de la cámara del celular). */
export async function fotoDePrueba(page, ancho, alto, tipo = 'image/jpeg') {
  const base64 = await page.evaluate(async ([w, h, t]) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    // Degradado con ruido para que el JPEG pese como una foto real
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#f06292'); grad.addColorStop(1, '#ffd54f');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `hsl(${Math.random() * 360},70%,${30 + Math.random() * 50}%)`;
      g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 40, 3 + Math.random() * 40);
    }
    const blob = await new Promise((r) => c.toBlob(r, t, 0.95));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, [ancho, alto, tipo]);
  return Buffer.from(base64, 'base64');
}

/** Sirve las fotos subidas al "Drive" simulado desde la memoria del simulador. */
export async function servirFotosSimuladas(page) {
  await page.route('https://lh3.googleusercontent.com/d/**', async (route) => {
    const id = route.request().url().split('/d/')[1].split('=')[0];
    const b64 = await page.evaluate((i) => {
      const a = window.__simulador && __simulador.archivos[i];
      if (!a || !a.bytes) return null;
      let s = '';
      for (let j = 0; j < a.bytes.length; j += 0x8000) s += String.fromCharCode.apply(null, a.bytes.slice(j, j + 0x8000));
      return btoa(s);
    }, id).catch(() => null);
    if (!b64) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from(b64, 'base64') });
  });
}
