export class APIError extends Error {
  protected statusCode: number;

  constructor(statusCode: number, message: any) {
    super(message);
    this.statusCode = statusCode;
  }

  public getStatus(): number {
    return this.statusCode;
  }
}

export class WebDriverError extends Error {
  constructor(private originalError: Error) {
    super();
  }

  public getError(): Error {
    return this.originalError;
  }
}

export class UnAuthorizedError extends APIError {
  constructor(message?: string) {
    super(401, message || "You are not authorized to perform this action");
  }
}

export class AccessDeniedError extends APIError {
  constructor() {
    super(403, "You are not authorized to perform this action");
  }
}

export class ObjectNotFoundError extends APIError {
  constructor(objectType: string, identifier?: any) {
    let message = `${objectType} `;
    if (identifier) {
      message += "with id " + identifier + " ";
    }
    message += "not found.";
    super(400, message);
  }
}

export class InvalidTokenError extends APIError {
  constructor() {
    super(400, "Invalid or expired token");
  }
}

export class SchemaValidationError extends APIError {
  constructor(validationResult: any) {
    let errorMessages: string[] = [];
    validationResult.error.details.forEach(function (errorDetails: any) {
      errorMessages.push(errorDetails.message);
    });
    super(400, errorMessages);
  }
}
