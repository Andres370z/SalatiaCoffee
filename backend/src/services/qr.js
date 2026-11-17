// RF-01: enlace wa.me que abre el chat con el código de la mesa prellenado.
// Este enlace es el contenido que se imprime como código QR en cada mesa.

function textoMesa(numero) {
  return `MESA-${numero}`;
}

// numeroPublico: número de WhatsApp del negocio; se ignoran "+", espacios y guiones
function enlaceWhatsApp(numeroPublico, numeroMesa) {
  const digitos = String(numeroPublico || '').replace(/\D/g, '');
  if (!digitos) throw new Error('WHATSAPP_NUMERO_PUBLICO no está configurado');
  return `https://wa.me/${digitos}?text=${encodeURIComponent(textoMesa(numeroMesa))}`;
}

module.exports = { textoMesa, enlaceWhatsApp };
