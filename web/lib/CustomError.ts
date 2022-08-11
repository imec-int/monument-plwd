export class CustomError extends Error {
  statusCode: number;
  statusText: string;
  text: string;

  constructor({
    statusCode = 500,
    statusText = 'Internal server error',
    message = '',
    text = '',
  }) {
    super(message);

    this.statusCode = statusCode;
    this.statusText = statusText;
    this.text = text;
  }

  toString(): string {
    return `Request failed with status: ${this.statusCode} ${this.statusText}`;
  }
}
