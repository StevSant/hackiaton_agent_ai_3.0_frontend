export class AppError extends Error {
  constructor(
    public readonly code: string,
    public override readonly message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
