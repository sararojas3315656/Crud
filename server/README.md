# Server (JSON Server)

Arrancar JSON Server (puerto **3007**):

//Servidor
```bash
 npx json-server --watch db.json --host 0.0.0.0 --port 3007

```
//Cliente
npx serve -l 3008

Ruta del recurso:
- `http:// 192.168.137.1:3007/todos`

//API BASE URL (cambiar x IP)