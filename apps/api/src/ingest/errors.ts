/** Raised for any malformed or unexpected input; ingestion never skips bad data silently. */
export class IngestError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IngestError";
  }
}
