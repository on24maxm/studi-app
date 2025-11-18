FROM denoland/deno:2.4.5

WORKDIR /app
EXPOSE 8000

COPY deps.ts .

RUN deno cache deps.ts

RUN chmod -R 777 /deno-dir

COPY . .

RUN chown -R deno:deno /app /deno-dir

USER deno

RUN chmod -R 755 /deno-dir
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]