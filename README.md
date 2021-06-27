# Gunpoint API
Gunpoint is a restful API for [Gun](https://github.com/amark/gun). You can fire it up with :
```sh
npm run start
```

## What you can do, currently :
`/get/[key]`: Use it to get data from a definied graph (`GET` request). \
`/put/[key] + request body (in JSON)`: Add data in a specified graph (`POST` request). \
`/put/[graph 1]/in/[graph 2]`: Put the graph 1 in the graph 2 (`POST` request).
`/delete/[data]/in/[graph]`: Delete defined data in a specified graph (DELETE request).