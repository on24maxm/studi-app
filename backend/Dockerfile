FROM denoland/deno:2.4.5

WORKDIR /app
EXPOSE 8000

COPY deps.ts .

RUN deno cache deps.ts

COPY . .

RUN chown -R deno:deno /app /deno-dir

USER deno

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]