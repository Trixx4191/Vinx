-- Newsletter subscribers.
--
-- A new table and no change to any existing one, so this cannot affect anything
-- already running.
--
-- The unique index on email is what makes a repeat sign-up an update rather than
-- a duplicate row, and it is enforced here rather than only in application code
-- because two requests arriving at the same moment would otherwise both pass a
-- "does this address exist" check and both insert.

CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    -- Which surface captured the address. Without it a list gives no way to tell
    -- what is actually working.
    "source" TEXT NOT NULL DEFAULT 'popup',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");
