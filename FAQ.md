# FAQ - AutoFactura ARCA

> **Aviso:** Este proyecto nacio como un proof of concept. Funciona, pero es experimental. Puede tener bugs, romperse si ARCA cambia su interfaz, o no cubrir todos los casos de uso. Usalo bajo tu responsabilidad y siempre revisa la factura antes de confirmar. Si encontras algo roto o te hay que agregar algo, [abri un issue](https://github.com/ann0nip/autofactura-arca/issues) y lo vemos.

## General

### Que es AutoFactura ARCA?
Es una extension de Chrome que automatiza la creacion de facturas electronicas en el portal de ARCA Monotributo (ex AFIP RCEL). Completa los formularios por vos, ahorrando tiempo en tareas repetitivas.

### Es gratis?
Si, AutoFactura ARCA es completamente gratuito y de codigo abierto.

### Es seguro?
Si. La extension:
- No envia tus datos a ningun servidor externo
- Toda la configuracion se guarda localmente en tu navegador (Chrome Storage)
- No recopila datos personales ni de uso
- El codigo es abierto y auditable en [GitHub](https://github.com/ann0nip/autofactura-arca)

Consulta nuestra [Politica de Privacidad](PRIVACY.md) para mas detalles.

---

## Uso

### Como empiezo?
1. Instala la extension desde la Chrome Web Store
2. Hace click en el icono de la extension
3. Completa tus datos en la pestana **Configuracion** (emisor, receptor, etc.)
4. Agrega los items de tu factura en la pestana **Items**
5. Hace click en **Abrir ARCA Monotributo** en el header para ir al portal
6. Logueate con tu CUIT y clave fiscal
7. Una vez dentro del portal, anda a la pestana **Ejecutar** y hace click en **Ejecutar automatizacion**

### Necesito estar logueado en ARCA?
Si. La extension completa formularios dentro del portal de ARCA, por lo que necesitas estar logueado y en la seccion de facturacion electronica.

### La extension hace la factura sola?
La extension completa todos los campos automaticamente pero se detiene antes del paso final de confirmacion. Vos tenes que revisar que todo este correcto y confirmar manualmente. Esto es intencional por seguridad.

### Puedo guardar mi configuracion?
Si. Usa el boton **Guardar** en cada pestana. Tu configuracion se mantiene guardada entre sesiones. Tambien podes exportarla como archivo JSON e importarla en otro navegador.

### Que tipos de factura soporta?
Factura A, B, C y E.

---

## Problemas comunes

### La extension dice que no estoy en la pagina de ARCA
Asegurate de estar en el portal de facturacion electronica de ARCA (`fe.afip.gob.ar`). Usa el boton **Abrir ARCA Monotributo** en el header de la extension para ir directamente.

### La automatizacion se detuvo a mitad de camino
Esto puede pasar si la pagina de ARCA tarda en cargar. Recarga la pagina y volve a ejecutar la automatizacion desde la extension.

### Los campos no se completan correctamente
Verifica que los datos en tu configuracion sean correctos, especialmente el CUIT/CUIL y el punto de venta. Si el problema persiste, [abri un issue](https://github.com/ann0nip/autofactura-arca/issues).

---

## Soporte

### Donde reporto un bug?
Podes [abrir un issue en GitHub](https://github.com/ann0nip/autofactura-arca/issues) describiendo el problema.

### Puedo contribuir al proyecto?
Si! El proyecto es open source. Forks y pull requests son bienvenidos.
