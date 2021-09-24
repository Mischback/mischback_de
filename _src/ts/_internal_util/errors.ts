class InternalUtilError extends Error {
  constructor(message: string) {
    super(message);
  }
}

class BustedManifestError extends InternalUtilError {
  constructor(message: string) {
    super(message);
  }
}

export class BustedManifestFilterByExtensionMismatch extends BustedManifestError {
  constructor(message: string) {
    super(message);
  }
}

export class BustedManifestFileSystemError extends BustedManifestError {
  constructor(message: string) {
    super(message);
  }
}

export class BustedManifestHashWalkerError extends BustedManifestError {
  constructor(message: string) {
    super(message);
  }
}

export class BustedManifestHashError extends BustedManifestError {
  constructor(message: string) {
    super(message);
  }
}

class DevBMSError extends InternalUtilError {
  constructor(message: string) {
    super(message);
  }
}

export class DevBMSConfigError extends DevBMSError {
  constructor(message: string) {
    super(message);
  }
}

export class DevBMSServerError extends DevBMSError {
  constructor(message: string) {
    super(message);
  }
}
