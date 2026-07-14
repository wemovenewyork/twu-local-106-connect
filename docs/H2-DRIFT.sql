-- AlterTable
ALTER TABLE "public"."search_queries" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "public"."document_chunks" ADD COLUMN     "search_vector" tsvector DEFAULT to_tsvector('english'::regconfig, content);

