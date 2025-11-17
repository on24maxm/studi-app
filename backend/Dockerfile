FROM denoland/deno:latest

WORKDIR /app

EXPOSE 8000

COPY deps.ts .

COPY .deno_cache /deno-dir/

COPY . .

RUN chown -R deno:deno /app /deno-dir

USER deno

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "--allow-write", "main.ts"]