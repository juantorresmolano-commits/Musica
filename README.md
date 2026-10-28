# Escuela de Música — API REST

API en Node.js, Express y Mongoose para administrar estudiantes. La aplicación usa la base de datos `escuela_musica` y la colección `estudiantes`. Se puede probar con Postman.

## 1. Requisitos

- Node.js LTS 20 o superior y npm.
- Un clúster activo en MongoDB Atlas.
- Un usuario de base de datos con permiso `readWrite` sobre `escuela_musica`.
- MongoDB Compass y Postman son opcionales; sirven para explorar la base y enviar solicitudes.

En Windows comprueba las herramientas así:

```powershell
node --version
npm.cmd --version
```

## 2. Atlas y la conexión

1. Inicia sesión en [MongoDB Atlas](https://cloud.mongodb.com/) y abre el proyecto que contiene tu clúster. Si aún no tienes clúster, créalo en **Database > Build a Database** y espera a que esté disponible.
2. En **Database Access**, crea un **Database User**. Elige autenticación por contraseña y dale el rol `readWrite` sobre la base `escuela_musica`. Anota el nombre y la contraseña de forma segura; no son necesariamente los de tu cuenta de Atlas.
3. En **Network Access**, agrega la IP actual desde la que ejecutarás Node.js. No uses acceso desde todas las IP salvo que comprendas el riesgo.
4. En **Database > Connect > Drivers**, elige **Node.js** y copia la URI que presenta Atlas. Sustituye los marcadores de usuario y contraseña por el Database User creado en el paso anterior. Si la contraseña contiene símbolos reservados de URL, codifícalos para URL.
5. Guarda la URI únicamente en el `.env` local del proyecto; no la envíes por chat, no la pongas en capturas y no la publiques.

No hace falta borrar `escuela_shell` ni crear manualmente otra base de datos. El proyecto selecciona `escuela_musica` mediante `dbName` y la crea en Atlas en la primera inserción. Si decides borrar una base desde Compass, primero confirma que es tuya y que no contiene nada que quieras conservar; la eliminación no es necesaria para este proyecto.

### Conectar MongoDB Compass (opcional)

En Atlas abre **Database > Connect > Compass**, copia la URI, reemplaza las credenciales por las del Database User y pégala en **New Connection** de Compass. Cuando la API inserte documentos, actualiza la lista del clúster: aparecerán `escuela_musica` y `estudiantes`. Que no aparezcan antes de la primera inserción es normal.

## 3. Configurar el proyecto

Abre `escuela-musica/.env`. Debe tener:

```dotenv
DB_NAME=escuela_musica
MONGODB_URI=
```

Pega la URI real proporcionada por Atlas después de `MONGODB_URI=`. Conserva `DB_NAME=escuela_musica`. No hay una URI de ejemplo porque el host depende de tu clúster. El `.env` está excluido de Git.

## 4. Instalar y arrancar

Abre la terminal integrada de VS Code:

```powershell
cd .\escuela-musica
npm.cmd install
npm.cmd test
npm.cmd start
```

En PowerShell se usa `npm.cmd` por si la política del sistema bloquea `npm.ps1`. Al iniciar, si la colección está vacía, la API inserta cinco estudiantes ficticios. Si ya hay al menos un estudiante, no vuelve a insertar ni elimina datos existentes. La API escucha en `http://localhost:3000`.

Para desarrollo con reinicio automático:

```powershell
npm.cmd run dev
```

## 5. Probar en Postman

En Postman puedes importar el archivo `postman/escuela-musica.postman_collection.json` mediante **Import > Files**. La colección incluye comprobación, listado, creación, consulta por ID, actualización parcial y eliminación. Ejecuta las solicitudes manualmente; la solicitud de creación guarda automáticamente el ID en una variable de colección. No ejecutes la solicitud de eliminación si quieres conservar ese registro de prueba.

Para todas las solicitudes que tengan cuerpo, selecciona **Body > raw > JSON** y usa el encabezado `Content-Type: application/json`.

| Operación | Método | URL |
|---|---|---|
| Comprobar estado | GET | `http://localhost:3000/api/health` |
| Listar estudiantes | GET | `http://localhost:3000/api/estudiantes` |
| Crear estudiante | POST | `http://localhost:3000/api/estudiantes` |
| Buscar por ID | GET | `http://localhost:3000/api/estudiantes/ID` |
| Reemplazar datos | PUT | `http://localhost:3000/api/estudiantes/ID` |
| Actualizar algunos campos | PATCH | `http://localhost:3000/api/estudiantes/ID` |
| Eliminar | DELETE | `http://localhost:3000/api/estudiantes/ID` |

Para crear un estudiante, envía este JSON con **POST**:

```json
{
  "nombre": "Elena Torres",
  "instrumento": "Piano",
  "nivel": "Principiante",
  "cancionFavorita": "Canon en Re"
}
```

Los niveles aceptados son `Principiante`, `Intermedio` y `Avanzado`. `nombre`, `instrumento` y `nivel` son obligatorios. `fechaInscripcion` es opcional; si se omite, se asigna la fecha actual. La respuesta de creación incluye el `_id`; copia ese valor para las solicitudes por ID.

Ejemplo **PATCH** para cambiar solo el instrumento:

```json
{
  "instrumento": "Guitarra"
}
```

Ejemplo **PUT**: envía todos los campos obligatorios, ya que reemplaza los datos editables. Para eliminar, envía **DELETE** a la URL con el ID correcto; Postman no puede pedir confirmación interactiva, así que revisa el ID antes de enviar.

Respuestas habituales: `200` al consultar/actualizar/eliminar, `201` al crear, `400` ante datos o ID inválidos, `404` si no existe el estudiante y `500` si ocurre un error interno.

## 6. Ver los documentos en Atlas o Compass

Cuando la aplicación haya conectado y creado los registros, en Atlas abre **Database > Browse Collections** (o actualiza la lista en Compass). Busca `escuela_musica` → `estudiantes`. Cada documento incluye `createdAt` y `updatedAt`.

## 7. Pruebas y errores comunes

Las pruebas locales no necesitan una URI:

```powershell
npm.cmd test
node --check index.js
```

- **Falta `MONGODB_URI`**: pega en `.env` la URI real de **Connect > Drivers**.
- **Tiempo de espera o IP no permitida**: revisa que el clúster esté activo y que tu IP esté en **Network Access**.
- **Autenticación fallida**: revisa las credenciales de **Database Access**, no la contraseña de inicio de sesión de Atlas.
- **Acceso denegado**: asigna al usuario el permiso `readWrite` para `escuela_musica`.
- **Postman no conecta**: primero inicia `npm.cmd start` y deja esa terminal abierta; comprueba `GET http://localhost:3000/api/health`.
- **Puerto 3000 ocupado**: configura `PORT=3001` en `.env` y usa `http://localhost:3001`.
- **`npm` bloqueado en PowerShell**: ejecuta `npm.cmd`.

La conexión a Atlas solo se considera verificada cuando el programa arranca con una URI válida y muestra el mensaje de conexión correcta.
