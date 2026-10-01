-- EntomoLens: extensions. Applied once. Idempotent.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;