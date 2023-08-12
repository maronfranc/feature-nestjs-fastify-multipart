# Nestjs platform fastify FileInterceptor sample

## Local upload example
`FileInterceptor` example with defined `dest` that saves files locally.
```sh
### Single file with `file` label
curl --location 'localhost:3000/local-upload/file' \
--form "file=@\"${PWD}/test-file-1.png\""

### Multiple files with `files` label
curl --location 'localhost:3000/local-upload/files' \
--form "files=@\"${PWD}/test-file-1.png\"" \
--form "files=@\"${PWD}/test-file-2.png\""

### Any
curl --location 'localhost:3000/local-upload/any' \
--form "any=@\"${PWD}/test-file-1.png\"" \
--form "file=@\"${PWD}/test-file-2.png\"" 

### Fields
curl --location 'localhost:3000/local-upload/fields' \
--form "profile=@\"${PWD}/test-file-1.png\"" \
--form "avatar=@\"${PWD}/test-file-2.png\"" 
```
## Cloud upload example (mocked version)
`FileInterceptor` example with undefined `dest` property.
```sh
### File
curl --location 'localhost:3000/cloud-upload/file' \
--form "file=@\"${PWD}/test-file-1.png\""

### Files
curl --location 'localhost:3000/cloud-upload/files' \
--form "files=@\"${PWD}/test-file-1.png\"" \
--form "files=@\"${PWD}/test-file-2.png\""

### Any
curl --location 'localhost:3000/cloud-upload/any' \
--form "any=@\"${PWD}/test-file-1.png\"" \
--form "file=@\"${PWD}/test-file-2.png\"" 

### Fields
curl --location 'localhost:3000/cloud-upload/fields' \
--form "profile=@\"${PWD}/test-file-1.png\"" \
--form "avatar=@\"${PWD}/test-file-2.png\"" 
```